from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import re
import httpx

import json
import sqlite3
from contextlib import contextmanager
from datetime import date, timedelta
from typing import Optional
from pydantic import BaseModel



import csv
import io
from urllib.parse import quote
from xml.etree import ElementTree as ET
from fastapi.responses import HTMLResponse, Response
from fpdf import FPDF


app = FastAPI(title="Weather App - Chennoufi Djebril")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
COORD_REGEX = re.compile(
    r"^\s*(?:(-?\d{1,3}\.\d+)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)|(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?))\s*$"
)

def resolve_location(query: str) -> dict:
    """Resolves coordinates, city names, or landmarks to latitude, longitude, and label."""
    query = query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Location query cannot be empty.")
    
    # 1. Check if user entered GPS coordinates (e.g., 35.69, -0.63)
    match = COORD_REGEX.match(query)
    if match:
        lat = float(match.group(1) or match.group(3))
        lon = float(match.group(2) or match.group(4))
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise HTTPException(status_code=400, detail="Coordinates are out of valid range.")
        return {"latitude": lat, "longitude": lon, "label": f"{lat:.4f}, {lon:.4f}"}

     # 2. Check Open-Meteo Geocoding for city/town names
    try:
        res = httpx.get(
            GEOCODE_URL,
            params={"name": query, "count": 1, "language": "en"},
            timeout=8.0,
        )
        if res.status_code == 200:
            results = res.json().get("results")
            if results:
                top = results[0]
                label_parts = [top.get("name"), top.get("admin1"), top.get("country")]
                label = ", ".join([p for p in label_parts if p])
                return {
                    "latitude": float(top["latitude"]),
                    "longitude": float(top["longitude"]),
                    "label": label,
                }
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Geocoding service unavailable.")

    # 3. Allow "Current Location" fallback to browser Geolocation API
    if query.lower() in ("current location", "my location", "current loc", "my loc", "here"):
        return {"latitude": None, "longitude": None, "label": "Current Location (Browser Geolocation)"}

    raise HTTPException(status_code=404, detail="Location not found.")






FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
# Standard WMO Weather interpretation codes
WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    95: "Thunderstorm",
}




def get_condition_name(code: int) -> str:
    """Helper to convert WMO weather code into readable text."""
    return WEATHER_CODES.get(code, "Cloudy")






@app.get("/weather")
def get_current_weather(location: str = Query(..., description="City, zip, or coordinates")):

    """Fetch current weather conditions for any location."""
    loc = resolve_location(location)
    try:
        res = httpx.get(
            FORECAST_URL,
            params={
                "latitude": loc["latitude"],
                "longitude": loc["longitude"],
                "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
                "timezone": "auto",
            },
            timeout=8.0,
        )
        res.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Weather service is currently unavailable.")
    current = res.json().get("current", {})
    code = current.get("weather_code")
    return {
        "location": loc["label"],
        "latitude": loc["latitude"],
        "longitude": loc["longitude"],
        "temperature": current.get("temperature_2m"),
        "humidity": current.get("relative_humidity_2m"),
        "wind_speed": current.get("wind_speed_10m"),
        "condition": get_condition_name(code),
        "weather_code": code,
        "time": current.get("time"),
    }








@app.get("/forecast")
def get_forecast(location: str = Query(..., description="Location name or coordinates")):
    """Fetch 5-day daily forecast."""
    loc = resolve_location(location)

    try:
        res = httpx.get(
            FORECAST_URL,
            params={
                "latitude": loc["latitude"],
                "longitude": loc["longitude"],
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "forecast_days": 5,
                "timezone": "auto",
            },
            timeout=8.0,
        )
        res.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Weather service unavailable.")

    daily = res.json().get("daily", {})
    times = daily.get("time", [])
    codes = daily.get("weather_code", [])
    highs = daily.get("temperature_2m_max", [])
    lows = daily.get("temperature_2m_min", [])
    rains = daily.get("precipitation_probability_max", [])

    forecast_days = []
    for i in range(len(times)):
        code = codes[i] if i < len(codes) else 0
        forecast_days.append({
            "date": times[i],
            "max_temp": highs[i] if i < len(highs) else None,
            "min_temp": lows[i] if i < len(lows) else None,
            "rain_chance": rains[i] if i < len(rains) else 0,
            "condition": get_condition_name(code),
            "weather_code": code,
        })

    return {
        "location": loc["label"],
        "latitude": loc["latitude"],
        "longitude": loc["longitude"],
        "days": forecast_days,
    }






DB_FILE = "weather.db"

@contextmanager
def get_db():
    """Context manager for SQLite connections with row-dict access."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()

def init_db():
    """Create the SQLite table if it does not exist."""
    with get_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS weather_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                temps_json TEXT NOT NULL,
                note TEXT DEFAULT ''
            )
            """
        )
init_db()






# --- Pydantic Schemas ---
class RecordCreate(BaseModel):
    location: str
    start_date: date
    end_date: date
    note: Optional[str] = ""
class RecordUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    note: Optional[str] = None



# --- Date Validation & Fetching ---
def validate_dates(start: date, end: date):
    """Enforce date range rules."""
    today = date.today()
    if end < start:
        raise HTTPException(status_code=400, detail="End date cannot be earlier than start date.")
    if (end - start).days > 31:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 31 days.")
    if start < today - timedelta(days=90) or end > today + timedelta(days=15):
        raise HTTPException(
            status_code=400,
            detail="Dates must be within the past 90 days and the next 15 days.",
        )





def fetch_daily_temps(lat: float, lon: float, start: date, end: date) -> list:

    """Fetch real historical/forecast daily temperatures for a date range."""
    try:
        res = httpx.get(
            FORECAST_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "daily": "temperature_2m_max,temperature_2m_min",
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "timezone": "auto",
            },
            timeout=8.0,
        )
        res.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Failed to fetch weather data for dates.")
    daily = res.json().get("daily", {})
    return [
        {"date": d, "max_temp": mx, "min_temp": mn}
        for d, mx, mn in zip(
            daily.get("time", []),
            daily.get("temperature_2m_max", []),
            daily.get("temperature_2m_min", []),
        )
    ]


def row_to_dict(row) -> dict:
    """Helper to convert SQLite row into a dict and parse stored temps JSON."""
    data = dict(row)
    data["temps"] = json.loads(data["temps_json"])
    del data["temps_json"]
    return data






# --- CREATE ---
@app.post("/records", status_code=201)
def create_record(body: RecordCreate):
    """Save a new weather record into the database."""
    validate_dates(body.start_date, body.end_date)
    loc = resolve_location(body.location)
    temps = fetch_daily_temps(
        loc["latitude"], loc["longitude"], body.start_date, body.end_date
    )

    with get_db() as db:
        cur = db.execute(
            """
            INSERT INTO weather_records 
            (location, latitude, longitude, start_date, end_date, temps_json, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                loc["label"],
                loc["latitude"],
                loc["longitude"],
                body.start_date.isoformat(),
                body.end_date.isoformat(),
                json.dumps(temps),
                body.note or "",
            ),
        )
        row = db.execute("SELECT * FROM weather_records WHERE id = ?", (cur.lastrowid,)).fetchone()

    return row_to_dict(row)


# --- READ ALL ---
@app.get("/records")
def get_all_records():
    """Read all saved records from the database."""
    with get_db() as db:
        rows = db.execute("SELECT * FROM weather_records ORDER BY id DESC").fetchall()
    return [row_to_dict(r) for r in rows]


# --- READ ONE ---
@app.get("/records/{record_id}")
def get_record(record_id: int):
    """Read a specific record by ID."""
    with get_db() as db:
        row = db.execute("SELECT * FROM weather_records WHERE id = ?", (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Record not found.")
    return row_to_dict(row)


# --- UPDATE ---
@app.put("/records/{record_id}")
def update_record(record_id: int, body: RecordUpdate):
    """Update a record's note or date range."""
    with get_db() as db:
        row = db.execute("SELECT * FROM weather_records WHERE id = ?", (record_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Record not found.")

        # Handle date updates (if dates change, re-fetch temperatures)
        if body.start_date is not None or body.end_date is not None:
            new_start = body.start_date or date.fromisoformat(row["start_date"])
            new_end = body.end_date or date.fromisoformat(row["end_date"])
            validate_dates(new_start, new_end)
            new_temps = fetch_daily_temps(row["latitude"], row["longitude"], new_start, new_end)
            temps_json = json.dumps(new_temps)
        else:
            new_start = date.fromisoformat(row["start_date"])
            new_end = date.fromisoformat(row["end_date"])
            temps_json = row["temps_json"]

        new_note = body.note if body.note is not None else row["note"]

        db.execute(
            """
            UPDATE weather_records 
            SET start_date = ?, end_date = ?, temps_json = ?, note = ?
            WHERE id = ?
            """,
            (new_start.isoformat(), new_end.isoformat(), temps_json, new_note, record_id),
        )
        updated_row = db.execute("SELECT * FROM weather_records WHERE id = ?", (record_id,)).fetchone()

    return row_to_dict(updated_row)


# --- DELETE ---
@app.delete("/records/{record_id}")
def delete_record(record_id: int):
    """Delete a record by ID."""
    with get_db() as db:
        cur = db.execute("DELETE FROM weather_records WHERE id = ?", (record_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Record not found.")
    return {"message": "Record deleted successfully", "deleted_id": record_id}

#=====================================================
#=====================================================
#=====================================================


@app.get("/records/{record_id}/extras")
def get_record_extras(record_id: int):
    """Provides Google Maps, YouTube travel search, and Wikipedia city context."""
    rec = get_record(record_id)
    city = rec["location"].split(",")[0].strip()
    maps_link = f"https://www.google.com/maps?q={rec['latitude']},{rec['longitude']}"
    youtube_link = f"https://www.youtube.com/results?search_query={quote(city + ' travel guide')}"
    # Query Wikipedia REST API for background summary
    wiki_summary = None
    try:
        r = httpx.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(city)}",
            headers={"User-Agent": "WeatherApp-ChennoufiDjebril/1.0"},
            timeout=5.0,
            follow_redirects=True,
        )
        if r.status_code == 200:
            wiki_summary = r.json().get("extract")
    except httpx.HTTPError:
        pass  # Extras are optional, don't crash if Wikipedia fails
    return {
        "location": rec["location"],
        "google_maps_url": maps_link,
        "youtube_search_url": youtube_link,
        "wikipedia_summary": wiki_summary,
    }

#=====================================================
#=====================================================
#=====================================================


@app.get("/export/{fmt}")
def export_records(fmt: str):
    """Export all stored weather records into different file formats."""
    with get_db() as db:
        rows = db.execute("SELECT * FROM weather_records ORDER BY id ASC").fetchall()
    records = [row_to_dict(r) for r in rows]
    fmt = fmt.lower()
    # 1. JSON Export
    if fmt == "json":
        return Response(
            content=json.dumps(records, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=weather_records.json"},
        )
    # 2. CSV Export
    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["record_id", "location", "date", "max_temp_c", "min_temp_c", "note"])
        for rec in records:
            for t in rec["temps"]:
                writer.writerow([
                    rec["id"],
                    rec["location"],
                    t["date"],
                    t["max_temp"],
                    t["min_temp"],
                    rec["note"],
                ])
        return Response(
            content=buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=weather_records.csv"},
        )
    # 3. XML Export
    if fmt == "xml":
        root = ET.Element("weather_records")
        for rec in records:
            item = ET.SubElement(root, "record", id=str(rec["id"]))
            ET.SubElement(item, "location").text = str(rec["location"])
            ET.SubElement(item, "start_date").text = str(rec["start_date"])
            ET.SubElement(item, "end_date").text = str(rec["end_date"])
            ET.SubElement(item, "note").text = str(rec["note"] or "")
            temps = ET.SubElement(item, "temperatures")
            for t in rec["temps"]:
                ET.SubElement(
                    temps,
                    "day",
                    date=str(t["date"]),
                    max=str(t["max_temp"]),
                    min=str(t["min_temp"]),
                )
        xml_str = ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
        return Response(
            content=xml_str,
            media_type="application/xml",
            headers={"Content-Disposition": "attachment; filename=weather_records.xml"},
        )
    # 4. Markdown Export
    if fmt in ("md", "markdown"):
        lines = ["# Weather Database Export", "", f"Total Records: {len(records)}", ""]
        for rec in records:
            lines.append(f"## Record #{rec['id']} - {rec['location']}")
            lines.append(f"**Period:** {rec['start_date']} to {rec['end_date']}")
            if rec["note"]:
                lines.append(f"**Note:** {rec['note']}")
            lines.append("")
            lines.append("| Date | Max Temp (°C) | Min Temp (°C) |")
            lines.append("| --- | --- | --- |")
            for t in rec["temps"]:
                lines.append(f"| {t['date']} | {t['max_temp']} | {t['min_temp']} |")
            lines.append("")
        return Response(
            content="\n".join(lines),
            media_type="text/markdown",
            headers={"Content-Disposition": "attachment; filename=weather_records.md"},
        )
    # 5. PDF Export
    if fmt == "pdf":
        def clean_latin1(text):
            return str(text).encode("latin-1", "replace").decode("latin-1")
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, "Weather Application - Data Export", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", size=10)
        pdf.cell(
            0,
            6,
            "Built by Chennoufi Djebril for PM Accelerator AI Engineer Assessment",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        pdf.ln(4)
        for rec in records:
            pdf.set_font("Helvetica", "B", 11)
            pdf.multi_cell(
                0,
                6,
                clean_latin1(f"#{rec['id']} {rec['location']} ({rec['start_date']} to {rec['end_date']})"),
                new_x="LMARGIN",
                new_y="NEXT",
            )
            pdf.set_font("Helvetica", size=9)
            if rec.get("note"):
                pdf.multi_cell(0, 5, clean_latin1(f"Note: {rec['note']}"), new_x="LMARGIN", new_y="NEXT")
            temps_str = ", ".join([f"{t['date']}: {t['min_temp']}C-{t['max_temp']}C" for t in rec["temps"]])
            pdf.multi_cell(0, 5, clean_latin1(f"Temps: {temps_str}"), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(3)
        return Response(
            content=bytes(pdf.output()),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=weather_records.pdf"},
        )
    raise HTTPException(status_code=400, detail="Supported formats: json, csv, xml, md, pdf.")

#=====================================================
#=====================================================
#=====================================================
#=====================================================
#=====================================================
#=====================================================#=====================================================
#=====================================================
#=====================================================


@app.get("/", response_class=HTMLResponse)
def root_home():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Weather App - Chennoufi Djebril</title>
        <style>
            body { font-family: sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; }
            h1 { color: #0f172a; margin-bottom: 4px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
            a { color: #2563eb; text-decoration: none; font-weight: 500; }
            a:hover { text-decoration: underline; }
            ul { padding-left: 20px; }
        </style>
    </head>
    <body>
        <h1>Weather Application API</h1>
        <p>Full Stack Assessment #1 &amp; #2 — Built by <b>Chennoufi Djebril</b></p>
        
        <div class="card">
            <h3>About PM Accelerator</h3>
            <p>PM Accelerator is a US-based company with a global reach, focused on AI learning and acting as a development hub for AI products. It offers an AI PM Bootcamp with hands-on experience, mentorship from professionals at top tech companies, and real-world projects.</p>
        </div>
        <h3>Quick Links</h3>
        <ul>
            <li><a href="/docs">Interactive API Documentation (Swagger UI)</a></li>
            <li><a href="/weather?location=Oran">Current Weather (Oran)</a></li>
            <li><a href="/forecast?location=Oran">5-Day Forecast (Oran)</a></li>
            <li><a href="/records">All Saved SQLite Records</a></li>
            <li>Export: 
                <a href="/export/json">JSON</a> | 
                <a href="/export/csv">CSV</a> | 
                <a href="/export/xml">XML</a> | 
                <a href="/export/md">Markdown</a> | 
                <a href="/export/pdf">PDF</a>
            </li>
        </ul>
    </body>
    </html>
    """



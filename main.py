"""
Weather Application - Full Stack Assessment (Frontend #1 & Backend #2)
Author: Chennoufi Djebril
Organization: PM Accelerator AI Engineer Assessment

Tech Stack:
- FastAPI (REST API framework)
- SQLite (relational database for data persistence)
- Open-Meteo API (weather forecasts & geocoding - free, no API key required)
- OpenStreetMap Nominatim (geocoding fallback for postal codes & landmarks)
- Wikipedia REST API (location enrichment)
- FPDF2 (PDF export generation)
"""

import csv
import io
import json
import re
import sqlite3
import threading
import time
from contextlib import contextmanager
from datetime import date, timedelta
from typing import List, Optional
from urllib.parse import quote
from xml.etree import ElementTree as ET

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from fpdf import FPDF
from pydantic import BaseModel, Field

# ==============================================================================
# 1. APP CONFIGURATION & CORS SETUP
# ==============================================================================

app = FastAPI(
    title="Weather App API",
    description="Full Stack Weather Application built by Chennoufi Djebril for PM Accelerator",
    version="1.0.0",
)

# Enable CORS so the React frontend (running on Vite or another port) can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "weather.db"
OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
NOMINATIM_URL = "https://nominatim.openstreetmap.org"
NOMINATIM_HEADERS = {
    "User-Agent": "WeatherApp-ChennoufiDjebril/1.0 (https://github.com/DjebrilSVN/weather-app)"
}

# Coordinate pattern: supports "35.69, -0.63" or "35.69 -0.63"
COORD_REGEX = re.compile(
    r"^\s*(?:(-?\d{1,3}\.\d+)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)|(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?))\s*$"
)

# Standard WMO Weather interpretation codes
WMO_WEATHER_CODES = {
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
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def get_weather_description(code: Optional[int]) -> str:
    """Map WMO numeric weather code to a human-readable condition."""
    if code is None:
        return "Unknown"
    return WMO_WEATHER_CODES.get(code, "Cloudy")


# ==============================================================================
# 2. DATABASE MANAGEMENT (SQLite)
# ==============================================================================

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
    """Initialize the SQLite database schema if not present."""
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
                note TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


init_db()


def record_row_to_dict(row: sqlite3.Row) -> dict:
    """Helper to convert an SQLite row to a clean serializable dictionary."""
    data = dict(row)
    data["temps"] = json.loads(data["temps_json"])
    del data["temps_json"]
    return data


# ==============================================================================
# 3. LOCATION & GEOCODING RESOLVER
# ==============================================================================

# Thread safety lock & cache to respect Nominatim's 1-request-per-second policy
_nominatim_lock = threading.Lock()
_last_nominatim_request_time = 0.0
_geocoding_cache = {}
_cache_lock = threading.Lock()


def resolve_location(query: str) -> dict:
    """
    Resolves user input into latitude, longitude, and a clean display name.
    Supports:
    1. GPS Coordinates (e.g. '35.69, -0.63')
    2. City or Town names (via Open-Meteo Geocoding)
    3. Postal / Zip codes, Landmarks, and Addresses (via Nominatim)
    """
    query = query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Location query cannot be empty.")

    cache_key = query.lower()
    with _cache_lock:
        if cache_key in _geocoding_cache:
            return dict(_geocoding_cache[cache_key])

    # Check 1: GPS Coordinates
    coord_match = COORD_REGEX.match(query)
    if coord_match:
        lat_str = coord_match.group(1) or coord_match.group(3)
        lon_str = coord_match.group(2) or coord_match.group(4)
        lat, lon = float(lat_str), float(lon_str)

        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            raise HTTPException(status_code=400, detail="Latitude must be [-90, 90] and Longitude [-180, 180].")

        label = f"{lat:.4f}, {lon:.4f}"
        result = {"latitude": lat, "longitude": lon, "label": label}
        with _cache_lock:
            _geocoding_cache[cache_key] = result
        return result

    # Check 2: City / Town via Open-Meteo Geocoding (fast fuzzy search)
    try:
        res = httpx.get(
            OPEN_METEO_GEOCODE_URL,
            params={"name": query, "count": 1, "language": "en"},
            timeout=8.0,
        )
        if res.status_code == 200:
            hits = res.json().get("results")
            if hits:
                top = hits[0]
                parts = [top.get("name"), top.get("admin1"), top.get("country")]
                label = ", ".join([p for p in parts if p])
                result = {
                    "latitude": float(top["latitude"]),
                    "longitude": float(top["longitude"]),
                    "label": label,
                }
                with _cache_lock:
                    _geocoding_cache[cache_key] = result
                return result
    except httpx.HTTPError:
        pass  # Fall back to Nominatim below

    # Check 3: Fallback via OpenStreetMap Nominatim (for zip codes & landmarks)
    global _last_nominatim_request_time
    with _nominatim_lock:
        elapsed = time.time() - _last_nominatim_request_time
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        try:
            res = httpx.get(
                f"{NOMINATIM_URL}/search",
                params={"q": query, "format": "jsonv2", "limit": 1},
                headers=NOMINATIM_HEADERS,
                timeout=10.0,
            )
            _last_nominatim_request_time = time.time()
            if res.status_code == 200:
                hits = res.json()
                if hits:
                    top = hits[0]
                    result = {
                        "latitude": float(top["lat"]),
                        "longitude": float(top["lon"]),
                        "label": top.get("display_name", query),
                    }
                    with _cache_lock:
                        _geocoding_cache[cache_key] = result
                    return result
        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="Geocoding service unavailable. Please try again.")

    raise HTTPException(status_code=404, detail=f"Location '{query}' could not be found.")


# ==============================================================================
# 4. DATE VALIDATION & WEATHER FETCHING
# ==============================================================================

def validate_date_range(start_date: date, end_date: date):
    """
    Enforces business rules for date inputs:
    - end_date cannot precede start_date.
    - Max range duration is 31 days.
    - Dates must be within past 90 days to next 15 days (API availability).
    """
    today = date.today()
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="End date cannot be earlier than start date.")

    if (end_date - start_date).days > 31:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 31 days.")

    min_allowed = today - timedelta(days=90)
    max_allowed = today + timedelta(days=15)

    if start_date < min_allowed or end_date > max_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Dates must be between {min_allowed.isoformat()} and {max_allowed.isoformat()}.",
        )


def fetch_daily_temperatures(lat: float, lon: float, start_date: date, end_date: date) -> List[dict]:
    """Retrieves real daily high/low temperatures from Open-Meteo for a given date range."""
    try:
        res = httpx.get(
            OPEN_METEO_FORECAST_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "daily": "temperature_2m_max,temperature_2m_min",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "timezone": "auto",
            },
            timeout=10.0,
        )
        res.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Failed to fetch weather data from external API.")

    data = res.json().get("daily", {})
    dates = data.get("time", [])
    max_temps = data.get("temperature_2m_max", [])
    min_temps = data.get("temperature_2m_min", [])

    return [
        {"date": d, "max_temp": mx, "min_temp": mn}
        for d, mx, mn in zip(dates, max_temps, min_temps)
    ]


# ==============================================================================
# 5. PYDANTIC SCHEMAS (REQUEST / RESPONSE MODELS)
# ==============================================================================

class RecordCreateRequest(BaseModel):
    location: str = Field(..., description="City, landmark, zip code, or GPS coordinates")
    start_date: date = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: date = Field(..., description="End date (YYYY-MM-DD)")
    note: Optional[str] = Field(default="", description="Optional travel or weather note")


class RecordUpdateRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    note: Optional[str] = None


# ==============================================================================
# 6. API ROUTES - WEATHER & FORECAST (TECH ASSESSMENT #1)
# ==============================================================================

@app.get("/weather", summary="Get Current Weather")
def get_current_weather(location: str = Query(..., description="Location to search")):
    """
    Returns real-time weather information:
    - Temperature, Relative Humidity, Wind Speed, Weather Condition
    - Location name and coordinates
    """
    loc = resolve_location(location)
    try:
        res = httpx.get(
            OPEN_METEO_FORECAST_URL,
            params={
                "latitude": loc["latitude"],
                "longitude": loc["longitude"],
                "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
                "timezone": "auto",
            },
            timeout=10.0,
        )
        res.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach weather provider.")

    current_data = res.json().get("current", {})
    code = current_data.get("weather_code")

    return {
        "location": loc["label"],
        "latitude": loc["latitude"],
        "longitude": loc["longitude"],
        "temperature": current_data.get("temperature_2m"),
        "humidity": current_data.get("relative_humidity_2m"),
        "wind_speed": current_data.get("wind_speed_10m"),
        "weather_code": code,
        "condition": get_weather_description(code),
        "time": current_data.get("time"),
    }


@app.get("/forecast", summary="Get 5-Day Weather Forecast")
def get_five_day_forecast(location: str = Query(..., description="Location to search")):
    """Returns a 5-day daily forecast with high/low temperatures, conditions, and rain chance."""
    loc = resolve_location(location)
    try:
        res = httpx.get(
            OPEN_METEO_FORECAST_URL,
            params={
                "latitude": loc["latitude"],
                "longitude": loc["longitude"],
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "forecast_days": 5,
                "timezone": "auto",
            },
            timeout=10.0,
        )
        res.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach weather provider.")

    daily = res.json().get("daily", {})
    times = daily.get("time", [])
    codes = daily.get("weather_code", [])
    maxs = daily.get("temperature_2m_max", [])
    mins = daily.get("temperature_2m_min", [])
    rains = daily.get("precipitation_probability_max", [])

    forecast_days = []
    for i in range(len(times)):
        code = codes[i] if i < len(codes) else None
        forecast_days.append({
            "date": times[i],
            "max_temp": maxs[i] if i < len(maxs) else None,
            "min_temp": mins[i] if i < len(mins) else None,
            "rain_chance": rains[i] if i < len(rains) else None,
            "weather_code": code,
            "condition": get_weather_description(code),
        })

    return {
        "location": loc["label"],
        "latitude": loc["latitude"],
        "longitude": loc["longitude"],
        "days": forecast_days,
    }


# ==============================================================================
# 7. API ROUTES - CRUD OPERATIONS (TECH ASSESSMENT #2.1)
# ==============================================================================

@app.post("/records", status_code=201, summary="CREATE Weather Record")
def create_weather_record(payload: RecordCreateRequest):
    """
    CREATE: Validates location and date range, fetches daily temperature data,
    and stores the record into the SQLite database.
    """
    validate_date_range(payload.start_date, payload.end_date)
    loc = resolve_location(payload.location)
    daily_temps = fetch_daily_temperatures(
        loc["latitude"], loc["longitude"], payload.start_date, payload.end_date
    )

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO weather_records (location, latitude, longitude, start_date, end_date, temps_json, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                loc["label"],
                loc["latitude"],
                loc["longitude"],
                payload.start_date.isoformat(),
                payload.end_date.isoformat(),
                json.dumps(daily_temps),
                payload.note or "",
            ),
        )
        record_id = cursor.lastrowid
        row = db.execute("SELECT * FROM weather_records WHERE id = ?", (record_id,)).fetchone()

    return record_row_to_dict(row)


@app.get("/records", summary="READ All Weather Records")
def get_all_records():
    """READ: Retrieves all persisted weather records (newest first)."""
    with get_db() as db:
        rows = db.execute("SELECT * FROM weather_records ORDER BY id DESC").fetchall()
    return [record_row_to_dict(row) for row in rows]


@app.get("/records/{record_id}", summary="READ One Weather Record")
def get_single_record(record_id: int):
    """READ: Retrieves a single record by its ID."""
    with get_db() as db:
        row = db.execute("SELECT * FROM weather_records WHERE id = ?", (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Weather record not found.")
    return record_row_to_dict(row)


@app.put("/records/{record_id}", summary="UPDATE Weather Record")
def update_weather_record(record_id: int, payload: RecordUpdateRequest):
    """
    UPDATE: Allows updating notes or date ranges.
    If dates are modified, validates them and refreshes daily temperatures to maintain consistency.
    """
    with get_db() as db:
        existing = db.execute("SELECT * FROM weather_records WHERE id = ?", (record_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Weather record not found.")

        # Determine target dates
        new_start = payload.start_date or date.fromisoformat(existing["start_date"])
        new_end = payload.end_date or date.fromisoformat(existing["end_date"])

        # If dates changed, re-fetch temperatures
        if payload.start_date is not None or payload.end_date is not None:
            validate_date_range(new_start, new_end)
            new_temps = fetch_daily_temperatures(
                existing["latitude"], existing["longitude"], new_start, new_end
            )
            temps_json = json.dumps(new_temps)
        else:
            temps_json = existing["temps_json"]

        new_note = payload.note if payload.note is not None else existing["note"]

        db.execute(
            """
            UPDATE weather_records
            SET start_date = ?, end_date = ?, temps_json = ?, note = ?
            WHERE id = ?
            """,
            (new_start.isoformat(), new_end.isoformat(), temps_json, new_note, record_id),
        )
        updated_row = db.execute("SELECT * FROM weather_records WHERE id = ?", (record_id,)).fetchone()

    return record_row_to_dict(updated_row)


@app.delete("/records/{record_id}", summary="DELETE Weather Record")
def delete_weather_record(record_id: int):
    """DELETE: Removes a weather record from the database."""
    with get_db() as db:
        cursor = db.execute("DELETE FROM weather_records WHERE id = ?", (record_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Weather record not found.")
    return {"message": "Record deleted successfully", "id": record_id}


# ==============================================================================
# 8. API ROUTES - ENRICHMENT & EXPORT (TECH ASSESSMENT #2.2 & #2.3)
# ==============================================================================

@app.get("/records/{record_id}/extras", summary="External API Integration")
def get_record_extras(record_id: int):
    """
    Section 2.2 Integration:
    Provides Google Maps link, YouTube search link, and Wikipedia summary for the record's location.
    """
    with get_db() as db:
        row = db.execute("SELECT * FROM weather_records WHERE id = ?", (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Weather record not found.")

    city_name = row["location"].split(",")[0].strip()
    maps_url = f"https://www.google.com/maps?q={row['latitude']},{row['longitude']}"
    youtube_url = f"https://www.youtube.com/results?search_query={quote(city_name + ' travel')}"

    # Query Wikipedia REST API for background summary
    wiki_summary = None
    try:
        wiki_res = httpx.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(city_name)}",
            headers={"User-Agent": "WeatherApp-ChennoufiDjebril/1.0"},
            timeout=6.0,
            follow_redirects=True,
        )
        if wiki_res.status_code == 200:
            wiki_summary = wiki_res.json().get("extract")
    except httpx.HTTPError:
        pass  # Graceful fallback: do not crash if Wikipedia is unreachable

    return {
        "location": row["location"],
        "google_maps_url": maps_url,
        "youtube_search_url": youtube_url,
        "wikipedia_summary": wiki_summary,
    }


@app.get("/export/{fmt}", summary="Export Records (JSON, CSV, XML, PDF, Markdown)")
def export_database_records(fmt: str):
    """
    Section 2.3: Exports stored weather records into JSON, CSV, XML, PDF, or Markdown formats.
    """
    with get_db() as db:
        rows = db.execute("SELECT * FROM weather_records ORDER BY id ASC").fetchall()
    records = [record_row_to_dict(r) for r in rows]

    fmt = fmt.lower()

    # --- JSON Export ---
    if fmt == "json":
        return Response(
            content=json.dumps(records, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=weather_records.json"},
        )

    # --- CSV Export ---
    if fmt == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["record_id", "location", "date", "max_temp_c", "min_temp_c", "note"])
        for rec in records:
            for item in rec["temps"]:
                writer.writerow([
                    rec["id"],
                    rec["location"],
                    item["date"],
                    item["max_temp"],
                    item["min_temp"],
                    rec["note"],
                ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=weather_records.csv"},
        )

    # --- XML Export ---
    if fmt == "xml":
        root = ET.Element("weather_records")
        for rec in records:
            item_elem = ET.SubElement(root, "record", id=str(rec["id"]))
            ET.SubElement(item_elem, "location").text = str(rec["location"])
            ET.SubElement(item_elem, "start_date").text = str(rec["start_date"])
            ET.SubElement(item_elem, "end_date").text = str(rec["end_date"])
            ET.SubElement(item_elem, "note").text = str(rec["note"] or "")
            temps_elem = ET.SubElement(item_elem, "temperatures")
            for t in rec["temps"]:
                ET.SubElement(
                    temps_elem,
                    "day",
                    date=str(t["date"]),
                    max=str(t["max_temp"]),
                    min=str(t["min_temp"]),
                )
        xml_string = ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
        return Response(
            content=xml_string,
            media_type="application/xml",
            headers={"Content-Disposition": "attachment; filename=weather_records.xml"},
        )

    # --- Markdown Export ---
    if fmt == "md" or fmt == "markdown":
        lines = ["# Weather Database Export", "", f"Total Records: {len(records)}", ""]
        for rec in records:
            lines.append(f"## #{rec['id']} - {rec['location']}")
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

    # --- PDF Export ---
    if fmt == "pdf":
        def sanitize_for_pdf(text: str) -> str:
            # Standard PDF Helvetica font supports Latin-1 character set
            return str(text).encode("latin-1", "replace").decode("latin-1")

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, "Weather Application - Data Export", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", size=10)
        pdf.cell(
            0,
            6,
            "Developed by Chennoufi Djebril for PM Accelerator AI Engineer Assessment",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        pdf.ln(4)

        for rec in records:
            pdf.set_font("Helvetica", "B", 11)
            pdf.multi_cell(
                0,
                6,
                sanitize_for_pdf(f"#{rec['id']} {rec['location']} ({rec['start_date']} to {rec['end_date']})"),
                new_x="LMARGIN",
                new_y="NEXT",
            )
            pdf.set_font("Helvetica", size=9)
            if rec.get("note"):
                pdf.multi_cell(0, 5, sanitize_for_pdf(f"Note: {rec['note']}"), new_x="LMARGIN", new_y="NEXT")

            temps_line = ", ".join([f"{t['date']}: {t['min_temp']}C-{t['max_temp']}C" for t in rec["temps"]])
            pdf.multi_cell(0, 5, sanitize_for_pdf(f"Temps: {temps_line}"), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(3)

        return Response(
            content=bytes(pdf.output()),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=weather_records.pdf"},
        )

    raise HTTPException(status_code=400, detail="Invalid format. Supported formats: json, csv, xml, md, pdf.")


# ==============================================================================
# 9. ROOT / HOMEPAGE WITH REQUIRED PM ACCELERATOR DESCRIPTION
# ==============================================================================

@app.get("/", response_class=HTMLResponse, summary="API Home")
def root_home():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Weather App API - Chennoufi Djebril</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; }
            h1 { color: #0f172a; margin-bottom: 4px; }
            .badge { display: inline-block; background: #e2e8f0; padding: 3px 8px; border-radius: 6px; font-size: 0.85em; font-weight: 600; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
            a { color: #2563eb; text-decoration: none; font-weight: 500; }
            a:hover { text-decoration: underline; }
            ul { padding-left: 20px; }
        </style>
    </head>
    <body>
        <h1>Weather Application API</h1>
        <p><span class="badge">Full Stack Assessment #1 &amp; #2</span> Built by <strong>Chennoufi Djebril</strong></p>
        
        <div class="card">
            <h3>About PM Accelerator</h3>
            <p>PM Accelerator is a US-based company with a global reach, focused on AI learning and acting as a development hub for AI products. It offers an AI PM Bootcamp with hands-on experience, mentorship from professionals at top tech companies, and real-world projects.</p>
        </div>

        <h3>Quick Links &amp; Documentation</h3>
        <ul>
            <li><a href="/docs">Interactive API Documentation (Swagger UI)</a></li>
            <li><a href="/weather?location=Oran">Current Weather Example (Oran)</a></li>
            <li><a href="/forecast?location=Oran">5-Day Forecast Example (Oran)</a></li>
            <li><a href="/records">Saved Database Records (SQLite)</a></li>
            <li>Exports: 
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

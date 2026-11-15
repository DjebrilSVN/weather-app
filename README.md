# Atmosphere — Full Stack Weather Application

A modern, responsive weather dashboard and persistence system built from scratch with **FastAPI**, **SQLite**, and **React + Vite**. It combines real-time weather retrieval, 5-day daily forecasting, SQLite CRUD persistence, external API enrichment, and multi-format data exports.

Built by **Chennoufi Djebril** for the **PM Accelerator AI Engineer Intern Technical Assessment** (completing both **Tech Assessment #1: Frontend** and **Tech Assessment #2: Backend — Full Stack**).

---

## About PM Accelerator
PM Accelerator is a US-based company with a global reach, focused on AI learning and acting as a development hub for AI products. It offers an AI PM Bootcamp with hands-on experience, mentorship from professionals at top tech companies, and real-world projects.

---

## Architectural Overview & Tech Stack

- **Backend:**
  - **Python 3.9+ & FastAPI:** High-performance asynchronous REST API with auto-generated Swagger documentation at `/docs`.
  - **SQLite (`sqlite3`):** Relational database with Python context management for safe transactions and persistent CRUD storage.
  - **Pydantic:** Type-safe request schemas and validation.
  - **HTTPX:** Async HTTP client communicating with weather and geocoding providers.
  - **FPDF2:** Structured document generation for PDF exports.
- **Frontend:**
  - **React 18 & Vite (JavaScript):** Modern component-driven client architecture following a web-first responsive design.
  - **Custom SVG Icons & Responsive CSS:** 100% custom inline SVG icons (zero emojis) and responsive styling adapting seamlessly across desktops, tablets, and smartphones.
- **External Public APIs (No API Keys Required):**
  - **Open-Meteo Weather API:** Real-time atmospheric metrics and 5-day daily forecasts.
  - **Open-Meteo Geocoding API:** Fast fuzzy-matching search for cities and towns worldwide.
  - **Wikipedia REST API:** Supplementary context and background summaries for searched locations.

---

## How to Run Locally

### 1. Backend (FastAPI + SQLite)
In your first terminal:
```bash
# Clone the repository
git clone https://github.com/DjebrilSVN/weather-app.git
cd weather-app

# Create and activate virtual environment
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload
```
- **Backend Home:** http://127.0.0.1:8000/
- **Interactive API Documentation (Swagger UI):** http://127.0.0.1:8000/docs

---

### 2. Frontend (React + Vite)
In a second terminal:
```bash
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```
Open **http://localhost:5173** in your web browser.

---

## Implemented Requirements

### Tech Assessment #1: Frontend Engineers
1. **Multi-Input Location Search:** Handles city names, postal/zip codes, landmarks, and raw GPS coordinates (e.g., `35.69, -0.63`).
2. **Current Weather Display:** Shows temperature (°C), WMO condition icon and description, humidity percentage, wind speed (km/h), and local observation timestamp.
3. **Current Location (Geolocation):** Integrated HTML5 Geolocation API (`"Use My Location"`) to automatically detect and query the user's current GPS coordinates.
4. **1.1 Five-Day Forecast:** Clean daily forecast grid showing day names ("Today", "Mon", "Tue"), condition icons, daily min/max temperatures, and rain probabilities.
5. **1.2 Graceful Error Handling:** Explicit alerts for non-existent locations, network failures, or denied geolocation permissions.
6. **Responsive Design:** Fluid layout adapting smoothly between widescreen monitors, tablets, and mobile smartphones.

### Tech Assessment #2: Backend Engineers
1. **2.1 Database Persistence & CRUD Operations (SQLite):**
   - **CREATE (`POST /records`):** Accepts location, start date, end date, and an optional note. Validates date ranges (end >= start, max 31-day window, within past 90 days to next 15 days), fetches real daily temperatures, and commits to SQLite.
   - **READ (`GET /records` & `GET /records/{id}`):** Lists all stored records and individual record lookups with collapsible daily temperatures.
   - **UPDATE (`PUT /records/{id}`):** Allows updating notes or date ranges (automatically re-validating and re-fetching temperatures if dates are modified).
   - **DELETE (`DELETE /records/{id}`):** Removes records with proper 404 validation.
2. **2.2 External API Integration (To Stand Apart):**
   - `GET /records/{id}/extras`: Generates deep links to Google Maps coordinates, YouTube travel videos, and live Wikipedia city summaries.
3. **2.3 Multi-Format Data Export:**
   - Supports on-demand exports of the database in 5 formats:
     - `GET /export/json` (Standard JSON)
     - `GET /export/csv` (Spreadsheet-ready CSV)
     - `GET /export/xml` (Structured XML)
     - `GET /export/pdf` (Formatted PDF using FPDF2)
     - `GET /export/md` (Markdown tables)

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/weather?location={query}` | Current weather by city, zip, landmark, or coordinates |
| `GET` | `/forecast?location={query}` | 5-day daily forecast |
| `POST` | `/records` | Create a new weather record in SQLite |
| `GET` | `/records` | Retrieve all saved records |
| `GET` | `/records/{id}` | Retrieve a single record by ID |
| `PUT` | `/records/{id}` | Update note or date range for a record |
| `DELETE`| `/records/{id}` | Delete a record |
| `GET` | `/records/{id}/extras` | Google Maps, YouTube, and Wikipedia enrichment |
| `GET` | `/export/{format}` | Export records (`json`, `csv`, `xml`, `pdf`, `md`) |

---

## Project Structure

```text
weather-app/
├── main.py                 # FastAPI backend, SQLite models, API routes & exporters
├── requirements.txt         # Python dependencies (fastapi, uvicorn, httpx, fpdf2)
├── weather.db              # SQLite database (auto-generated on startup)
├── README.md               # Project documentation & setup instructions
├── .gitignore              # Ignored files (venv, node_modules, build artifacts)
└── frontend/
    ├── index.html          # HTML entry point with metadata
    ├── package.json        # Frontend dependencies (React 18, Vite)
    ├── vite.config.js      # Vite build configuration
    └── src/
        ├── api.js          # REST API client wrapper & error formatting
        ├── App.jsx         # Main application controller
        ├── App.css         # Responsive stylesheets (Dark-slate theme)
        ├── index.css       # Clean box-sizing reset
        ├── main.jsx        # React root renderer
        └── components/
            ├── SearchBar.jsx       # Location input, suggestion chips & geolocation
            ├── CurrentWeather.jsx  # Real-time metrics card & custom SVG icons
            ├── Forecast.jsx        # 5-day daily forecast grid
            ├── RecordsSection.jsx  # SQLite CRUD interface, notes & export triggers
            └── Footer.jsx          # Author credit & PM Accelerator company description
```

---

## Assessments Completed
- **Tech Assessment #1 (Frontend):** Completed
- **Tech Assessment #2 (Backend):** Completed
- **Candidate Priority:** Full Stack Candidate

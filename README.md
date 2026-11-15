# Atmosphere — Weather Application

A Full Stack Weather Application combining real-time meteorological API retrieval, 5-day forecasting, SQLite database persistence with full CRUD capabilities, and multi-format data export.

Built by **Chennoufi Djebril** for the **PM Accelerator AI Engineer Intern Technical Assessment** (completing both **Tech Assessment #1: Frontend** and **Tech Assessment #2: Backend**).

---

## About PM Accelerator
PM Accelerator is a US-based company with a global reach, focused on AI learning and acting as a development hub for AI products. It offers an AI PM Bootcamp with hands-on experience, mentorship from professionals at top tech companies, and real-world projects.

---

## Architectural Overview & Tech Stack

This project was built from the ground up focusing on clean software engineering principles, modularity, and readable code:

- **Backend:** 
  - **Python 3.9+ & FastAPI:** High-performance, asynchronous REST API with automatic OpenAPI documentation (`/docs`).
  - **SQLite (`sqlite3`):** Serverless, zero-configuration relational database for persistent CRUD operations.
  - **Pydantic:** Robust request data validation and schema definitions.
  - **HTTPX:** Asynchronous HTTP client for communicating with external APIs.
  - **FPDF2:** Structured document generation for PDF exports.
- **Frontend:**
  - **React 18 & Vite (JavaScript):** Modern, component-driven client architecture following a web-first responsive design.
  - **Vanilla CSS3:** Clean, custom responsive design adapting seamlessly to desktops, tablets, and smartphones using Flexbox, CSS Grid, and media queries.
- **External APIs (Free & No API Keys Required):**
  - **Open-Meteo Weather API:** Real-time atmospheric conditions and 5-day daily forecasts.
  - **Open-Meteo Geocoding API:** Fuzzy-matching geocoder for cities and towns worldwide.
  - **OpenStreetMap Nominatim:** Fallback geocoding for postal/zip codes, landmarks, and reverse geocoding with thread-safe rate-limiting.
  - **Wikipedia REST API:** Supplementary context extracts for searched cities.

---

## Quick Start & Installation

### 1. Run the Backend (FastAPI)
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

# Start the server
uvicorn main:app --reload
```
The backend will run at **http://127.0.0.1:8000**.
- Interactive API Documentation (Swagger UI): **http://127.0.0.1:8000/docs**
- Alternative Docs (ReDoc): **http://127.0.0.1:8000/redoc**

---

### 2. Run the Frontend (React + Vite)
In a second terminal, navigate to the `frontend` folder:
```bash
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```
Open **http://localhost:5173** in your web browser.

*(Optional)* To point the frontend to a remote or alternate backend URL, set the `VITE_API_URL` environment variable (defaults to `http://127.0.0.1:8000`).

---

## Implemented Requirements

### Tech Assessment #1: Frontend Engineers
1. **Multi-Input Location Search:** Handles city names, postal/zip codes, landmarks, and GPS coordinates (e.g., `35.69, -0.63`).
2. **Current Weather Display:** Shows temperature (°C), weather condition icon and description, humidity percentage, wind speed, and observation timestamp.
3. **Current Location (Geolocation):** Integrated HTML5 Geolocation API (`"📍 Use My Location"`) to automatically detect and query the user's current GPS coordinates.
4. **1.1 Five-Day Forecast:** Clear, structured grid showing daily min/max temperatures, condition icons, and rain probabilities.
5. **1.2 Graceful Error Handling:** Explicit user-facing alerts for unfound cities, blocked geolocation permissions, invalid date inputs, or backend connection issues.
6. **Responsive Design:** Fluid layout adapting smoothly between widescreen monitors, tablets, and mobile smartphones.

### Tech Assessment #2: Backend Engineers
1. **2.1 Database Persistence & CRUD Operations (SQLite):**
   - **CREATE (`POST /records`):** Accepts location, start date, end date, and an optional note. Validates date bounds (end >= start, max 31-day window, within past 90 days to next 15 days), fetches real daily temperatures, and commits to SQLite.
   - **READ (`GET /records` & `GET /records/{id}`):** Lists all stored records and individual record lookups.
   - **UPDATE (`PUT /records/{id}`):** Allows updating notes or date ranges. When dates change, automatically re-validates and refreshes stored temperatures to guarantee data consistency.
   - **DELETE (`DELETE /records/{id}`):** Removes records with proper 404 checks.
2. **2.2 External API Integration (To Stand Apart):**
   - `GET /records/{id}/extras`: Generates deep links to Google Maps coordinates, YouTube location travel search queries, and retrieves Wikipedia city summary extracts.
3. **2.3 Multi-Format Data Export:**
   - Supports on-demand exports of the SQLite database in 5 formats:
     - `GET /export/json` (Standard JSON payload)
     - `GET /export/csv` (Spreadsheet-ready comma-separated values)
     - `GET /export/xml` (Structured hierarchical XML)
     - `GET /export/pdf` (Formatted printable document using FPDF2)
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
├── README.md               # Documentation & setup instructions
├── .gitignore              # Ignored files (venv, node_modules, build artifacts)
└── frontend/
    ├── index.html          # HTML entry point with metadata
    ├── package.json        # Frontend dependencies (React 18, Vite)
    ├── vite.config.js      # Vite build configuration
    └── src/
        ├── api.js          # REST API client wrapper & error formatting
        ├── App.jsx         # Main application controller
        ├── App.css         # Responsive stylesheets
        ├── main.jsx        # React root renderer
        └── components/
            ├── SearchBar.jsx       # Location input, suggestion chips & geolocation
            ├── CurrentWeather.jsx  # Real-time metrics card & condition icons
            ├── Forecast.jsx        # 5-day daily forecast grid
            ├── RecordsSection.jsx  # SQLite CRUD interface, notes, & export triggers
            └── Footer.jsx          # Author credit & PM Accelerator company description
```

---

## Assessments Completed
- **Tech Assessment #1 (Frontend):** Completed
- **Tech Assessment #2 (Backend):** Completed
- **Candidate Priority:** Full Stack Candidate

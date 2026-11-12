import { useEffect, useState } from "react";
import { api, API_URL } from "./api.js";
import { BentoMetrics } from "./components/BentoMetrics.jsx";
import { HourlyChart } from "./components/HourlyChart.jsx";
import {
  CalendarIcon,
  DownloadIcon,
  DropletIcon,
  EditIcon,
  InfoIcon,
  MapIcon,
  PinIcon,
  RainIcon,
  SearchIcon,
  TrashIcon,
  VideoIcon,
  WeatherIcon,
  WindIcon,
} from "./components/WeatherIcons.jsx";
import "./App.css";

const EXPORT_FORMATS = ["json", "csv", "xml", "pdf", "md"];
const QUICK_PLACES = ["Oran", "London", "Tokyo", "New York"];

function isoDay(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayName(iso, index) {
  if (index === 0) return "Today";
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" });
}

function shortDate(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function fullLocalDate(iso) {
  if (!iso) return "";
  const [datePart, timePart] = iso.split("T");
  const d = new Date(datePart + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${d} · ${timePart}`;
}

/* ---------- Hero Current Weather ---------- */
function CurrentWeather({ place, current, today }) {
  return (
    <section className="glass-card hero-card" aria-label="Current weather">
      <div className="hero-top">
        <div className="hero-info">
          <div className="hero-place-row">
            <PinIcon size={16} />
            <p className="hero-place">{place}</p>
          </div>
          <p className="hero-date">{fullLocalDate(current.time)}</p>

          <div className="hero-temp-row">
            <p className="hero-temp">
              {Math.round(current.temperature_2m)}
              <span className="hero-deg">°C</span>
            </p>
            <div className="hero-meta">
              <p className="hero-cond">{current.description}</p>
              <p className="hero-hl">
                {today?.max != null && today?.min != null
                  ? `H: ${Math.round(today.max)}°  ·  L: ${Math.round(today.min)}°`
                  : ""}
                {current.apparent_temperature != null
                  ? `  ·  Feels like ${Math.round(current.apparent_temperature)}°`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="hero-icon-wrap">
          <WeatherIcon code={current.weather_code} isDay={current.is_day} size={126} />
        </div>
      </div>

      {/* 3-stat quick summary pill inspired by screen 1 */}
      <dl className="hero-stats">
        <div className="hero-stat">
          <dt>
            <WindIcon size={16} />
            <span>Wind</span>
          </dt>
          <dd>{Math.round(current.wind_speed_10m)} km/h</dd>
        </div>
        <div className="hero-stat">
          <dt>
            <DropletIcon size={16} />
            <span>Humidity</span>
          </dt>
          <dd>{current.relative_humidity_2m}%</dd>
        </div>
        <div className="hero-stat">
          <dt>
            <RainIcon size={16} />
            <span>Rain</span>
          </dt>
          <dd>{today?.rain_chance != null ? `${today.rain_chance}%` : `${current.rain ?? 0} mm`}</dd>
        </div>
      </dl>
    </section>
  );
}

/* ---------- 5-Day Forecast ---------- */
function Forecast({ days }) {
  const lo = Math.min(...days.map((d) => d.min));
  const hi = Math.max(...days.map((d) => d.max));
  const span = hi - lo || 1;

  return (
    <section className="glass-card forecast-panel" aria-label="Five-day forecast">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">5-Day Forecast</h2>
          <p className="panel-sub">Daily outlook, rain probability &amp; thermal range</p>
        </div>
      </div>

      <ol className="forecast-list">
        {days.map((d, i) => (
          <li key={d.date} className="forecast-row">
            <div className="fc-day">
              <strong>{dayName(d.date, i)}</strong>
              <span>{shortDate(d.date)}</span>
            </div>

            <div className="fc-icon-desc">
              <WeatherIcon code={d.weather_code} isDay={1} size={38} />
              <div>
                <p className="fc-desc">{d.description}</p>
                <p className="fc-rain">
                  {d.rain_chance != null ? `${d.rain_chance}% rain` : ""}
                  {d.uv_max != null ? ` · UV ${Math.round(d.uv_max)}` : ""}
                </p>
              </div>
            </div>

            <div className="fc-temps">
              <span className="fc-min">{Math.round(d.min)}°</span>
              <div
                className="range"
                role="img"
                aria-label={`Low ${Math.round(d.min)}, high ${Math.round(d.max)} degrees`}
              >
                <span
                  className="range-bar"
                  style={{
                    left: `${((d.min - lo) / span) * 100}%`,
                    width: `${Math.max(((d.max - d.min) / span) * 100, 8)}%`,
                  }}
                />
              </div>
              <strong className="fc-max">{Math.round(d.max)}°</strong>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Saved Record Card (CRUD + Extras) ---------- */
function RecordCard({ rec, onChanged, onError }) {
  const [note, setNote] = useState(rec.note || "");
  const [editDates, setEditDates] = useState(false);
  const [start, setStart] = useState(rec.start_date);
  const [end, setEnd] = useState(rec.end_date);
  const [open, setOpen] = useState(false);
  const [extras, setExtras] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(fn) {
    setBusy(true);
    onError("");
    try {
      await fn();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const saveUpdate = () =>
    run(async () => {
      const payload = { note };
      if (editDates) {
        payload.start_date = start;
        payload.end_date = end;
      }
      await api(`/records/${rec.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setEditDates(false);
      await onChanged();
    });

  const remove = () =>
    run(async () => {
      await api(`/records/${rec.id}`, { method: "DELETE" });
      await onChanged();
    });

  const loadExtras = () =>
    run(async () => {
      setExtras(await api(`/records/${rec.id}/extras`));
    });

  return (
    <li className="record-card">
      <div className="record-head">
        <div>
          <h3>{rec.location}</h3>
          <p className="muted">
            <CalendarIcon size={14} /> {shortDate(rec.start_date)} to {shortDate(rec.end_date)} (
            {rec.temps.length} {rec.temps.length === 1 ? "day" : "days"})
          </p>
        </div>

        <div className="record-toggles">
          <button type="button" className="ghost-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Hide temperatures" : "Show temperatures"}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setEditDates(!editDates)}
            aria-expanded={editDates}
          >
            <EditIcon size={14} /> {editDates ? "Cancel dates" : "Edit dates"}
          </button>
        </div>
      </div>

      {editDates && (
        <div className="edit-dates-row">
          <label>
            From
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
      )}

      {open && (
        <div className="temps-wrap">
          <table className="temps">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">High</th>
                <th scope="col">Low</th>
              </tr>
            </thead>
            <tbody>
              {rec.temps.map((t) => (
                <tr key={t.date}>
                  <td>{shortDate(t.date)}</td>
                  <td>{t.max}°C</td>
                  <td>{t.min}°C</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="note-row">
        <label htmlFor={`note-${rec.id}`} className="sr-only">
          Note for {rec.location}
        </label>
        <input
          id={`note-${rec.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a travel or weather note..."
        />
        <button type="button" onClick={saveUpdate} disabled={busy} className="btn-primary">
          {editDates ? "Save changes" : "Save note"}
        </button>
        <button type="button" onClick={loadExtras} disabled={busy} className="btn-secondary">
          <InfoIcon size={15} /> Place info
        </button>
        <button type="button" onClick={remove} disabled={busy} className="btn-danger">
          <TrashIcon size={15} /> Delete
        </button>
      </div>

      {extras && (
        <div className="extras">
          {extras.wikipedia_summary && <p className="extras-wiki">{extras.wikipedia_summary}</p>}
          <div className="extras-links">
            <a href={extras.google_maps_link} target="_blank" rel="noreferrer" className="ext-link">
              <MapIcon size={15} /> Open in Google Maps
            </a>
            <a href={extras.youtube_search_link} target="_blank" rel="noreferrer" className="ext-link">
              <VideoIcon size={15} /> Travel videos on YouTube
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

/* ---------- Main App ---------- */
export default function App() {
  const [query, setQuery] = useState("Oran");
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [records, setRecords] = useState([]);
  const [recordsError, setRecordsError] = useState("");
  const [startDate, setStartDate] = useState(isoDay(-4));
  const [endDate, setEndDate] = useState(isoDay(0));
  const [saving, setSaving] = useState(false);

  async function loadRecords() {
    try {
      setRecords(await api("/records"));
      setRecordsError("");
    } catch (e) {
      setRecordsError(e.message);
    }
  }

  async function search(q) {
    const text = (q ?? query).trim();
    if (!text) {
      setError("Enter a city, zip code, landmark or coordinates first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const enc = encodeURIComponent(text);
      const [now, fc] = await Promise.all([
        api(`/weather?location=${enc}`),
        api(`/forecast?location=${enc}`),
      ]);
      setWeatherData(now);
      setForecastData(fc);
    } catch (e) {
      setWeatherData(null);
      setForecastData(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
    search("Oran");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("This browser can't share your location. Type a place instead.");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const q = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        setQuery(q);
        search(q);
      },
      () => {
        setLoading(false);
        setError("Location access was blocked. Allow it in your browser or type a place instead.");
      }
    );
  }

  async function saveRecord(e) {
    e.preventDefault();
    if (!query.trim()) {
      setRecordsError("Search for a place first, then choose the dates to save.");
      return;
    }
    setSaving(true);
    setRecordsError("");
    try {
      await api("/records", {
        method: "POST",
        body: JSON.stringify({ location: query.trim(), start_date: startDate, end_date: endDate }),
      });
      await loadRecords();
    } catch (err) {
      setRecordsError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />

      <div className="page">
        {/* Header & Search */}
        <header className="topbar">
          <div className="brand">
            <WeatherIcon code={weatherData?.current?.weather_code ?? 1} isDay={1} size={40} />
            <div>
              <h1>Atmosphere</h1>
              <p className="lede">Real-time weather, hourly curves &amp; trip planning</p>
            </div>
          </div>

          <form
            className="search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <label htmlFor="q" className="sr-only">
              Location
            </label>
            <div className="search-input-wrap">
              <SearchIcon size={18} />
              <input
                id="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="City, zip code, landmark or 35.69, -0.63"
                autoComplete="off"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
            <button type="button" className="btn-secondary" onClick={useMyLocation} disabled={loading}>
              <PinIcon size={16} /> Use my location
            </button>
          </form>

          <div className="quick-chips" aria-label="Quick city examples">
            <span className="chips-label">Try:</span>
            {QUICK_PLACES.map((city) => (
              <button
                key={city}
                type="button"
                className="chip"
                onClick={() => {
                  setQuery(city);
                  search(city);
                }}
              >
                {city}
              </button>
            ))}
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </header>

        <main className="dashboard">
          {weatherData ? (
            <>
              <div className="dash-top-grid">
                <CurrentWeather
                  place={weatherData.location}
                  current={weatherData.current}
                  today={weatherData.today}
                />
                {forecastData?.hourly && (
                  <HourlyChart
                    hourly={forecastData.hourly}
                    days={forecastData.days}
                    currentTime={weatherData.current.time}
                  />
                )}
              </div>

              <BentoMetrics
                current={weatherData.current}
                today={weatherData.today}
                airQuality={weatherData.air_quality}
              />

              {forecastData?.days && <Forecast days={forecastData.days} />}
            </>
          ) : (
            !error && (
              <div className="glass-card empty-state">
                <p>
                  {loading
                    ? "Loading live atmospheric data…"
                    : "Search for any city, postal code, landmark, or GPS coordinates to view the forecast."}
                </p>
              </div>
            )
          )}

          {/* Saved Records (CRUD + Export) */}
          <section className="glass-card saved-panel" aria-label="Saved weather records">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Saved Date Ranges</h2>
                <p className="panel-sub">
                  Persist historical &amp; forecast temperature ranges in SQLite (up to 90 days back and
                  15 days ahead, max 31-day span).
                </p>
              </div>

              <div className="exports" aria-label="Export saved records">
                <span className="exports-label">
                  <DownloadIcon size={14} /> Export:
                </span>
                {EXPORT_FORMATS.map((f) => (
                  <a
                    key={f}
                    href={`${API_URL}/export/${f}`}
                    target="_blank"
                    rel="noreferrer"
                    className="export-pill"
                  >
                    {f.toUpperCase()}
                  </a>
                ))}
              </div>
            </div>

            <form className="save-form" onSubmit={saveRecord}>
              <label>
                From
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn-primary" disabled={saving}>
                <CalendarIcon size={16} />
                {saving ? "Saving…" : `Save range for "${query.trim() || "location"}"`}
              </button>
            </form>

            {recordsError && (
              <p className="error" role="alert">
                {recordsError}
              </p>
            )}

            {records.length === 0 && !recordsError ? (
              <p className="empty-inline">
                Nothing saved yet. Pick a place and date range above to store it in the database.
              </p>
            ) : (
              <ul className="records-list">
                {records.map((r) => (
                  <RecordCard key={r.id} rec={r} onChanged={loadRecords} onError={setRecordsError} />
                ))}
              </ul>
            )}
          </section>
        </main>

        <footer className="footer glass-card">
          <p>
            Built by <strong>Chennoufi Djebril</strong> for the PM Accelerator AI Engineer Intern technical
            assessment (Assessment #1 Frontend &amp; #2 Backend — Full Stack).
          </p>
          <p>
            <strong>About PM Accelerator:</strong> PM Accelerator is a US-based company with a global
            reach, focused on AI learning and acting as a development hub for AI products. It offers
            an AI PM Bootcamp with hands-on experience, mentorship from professionals at top tech
            companies, and real-world projects.
          </p>
        </footer>
      </div>
    </div>
  );
}

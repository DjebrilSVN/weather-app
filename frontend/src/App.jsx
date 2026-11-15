import React, { useState, useEffect } from "react";
import { fetchCurrentWeather, fetchForecast, fetchRecords } from "./api.js";
import SearchBar from "./components/SearchBar.jsx";
import CurrentWeather from "./components/CurrentWeather.jsx";
import Forecast from "./components/Forecast.jsx";
import RecordsSection from "./components/RecordsSection.jsx";
import Footer from "./components/Footer.jsx";
import "./App.css";

export default function App() {
  const [currentLocation, setCurrentLocation] = useState("Oran");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Search weather & forecast for a location
  const handleSearch = async (query) => {
    if (!query || !query.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const [currentData, forecastData] = await Promise.all([
        fetchCurrentWeather(query),
        fetchForecast(query),
      ]);
      setWeather(currentData);
      setForecast(forecastData);
      setCurrentLocation(query);
    } catch (err) {
      setErrorMsg(err.message || "Failed to fetch weather data.");
    } finally {
      setLoading(false);
    }
  };

  // Browser Geolocation ("Use My Location")
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser. Please type a city name.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        handleSearch(coords);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg("Location permission was denied. Please allow it or type a location manually.");
        } else {
          setErrorMsg("Could not detect GPS location. Please type a city name instead.");
        }
      },
      { timeout: 8000 }
    );
  };

  // Load saved SQLite records
  const loadRecords = async () => {
    try {
      const data = await fetchRecords();
      setRecords(data);
    } catch (err) {
      console.error("Could not load database records:", err);
    }
  };

  // Initial load on startup
  useEffect(() => {
    handleSearch("Oran");
    loadRecords();
  }, []);

  return (
    <div className="page-shell">
      <header className="page-header">
        <span className="badge">Full Stack Assessment #1 &amp; #2</span>
        <h1 className="main-title">Atmosphere Weather App</h1>
        <p className="main-subtitle">
          Real-time weather retrieval, 5-day daily forecast, and SQLite database persistence
        </p>
      </header>

      <main className="content-container">
        {/* Search & Geolocation */}
        <SearchBar
          onSearch={handleSearch}
          onUseLocation={handleUseLocation}
          loading={loading}
        />

        {/* Graceful Error Alert (Section 1.2) */}
        {errorMsg && (
          <div className="alert-box alert-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Loading weather data...</span>
          </div>
        )}

        {/* Weather Results Grid */}
        {!loading && weather && (
          <div className="weather-row">
            <CurrentWeather weather={weather} />
            <Forecast forecast={forecast} />
          </div>
        )}

        {/* SQLite Database CRUD & Exports (Section 2) */}
        <RecordsSection
          records={records}
          onRecordsChange={loadRecords}
          currentLocationQuery={currentLocation}
        />
      </main>

      <Footer />
    </div>
  );
}
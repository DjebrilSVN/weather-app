import React, { useState, useEffect } from "react";
import { fetchCurrentWeather, fetchForecast, fetchRecords } from "./api.js";
import SearchBar from "./components/SearchBar.jsx";
import CurrentWeather from "./components/CurrentWeather.jsx";
import Forecast from "./components/Forecast.jsx";
import RecordsSection from "./components/RecordsSection.jsx";
import Footer from "./components/Footer.jsx";
import "./App.css";

export default function App() {
  const [currentQuery, setCurrentQuery] = useState("Oran");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load weather & 5-day forecast for a given location
  const handleSearch = async (locationQuery) => {
    if (!locationQuery || !locationQuery.trim()) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const [weatherData, forecastData] = await Promise.all([
        fetchCurrentWeather(locationQuery),
        fetchForecast(locationQuery),
      ]);
      setWeather(weatherData);
      setForecast(forecastData);
      setCurrentQuery(locationQuery);
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred while fetching weather.");
    } finally {
      setLoading(false);
    }
  };

  // Browser Geolocation ("Use My Location")
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser. Please type a city name.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coordsQuery = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        handleSearch(coordsQuery);
      },
      (error) => {
        setLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage("Location access was denied. Please allow location permissions or type a city name.");
        } else {
          setErrorMessage("Unable to determine your GPS location. Please type a city name instead.");
        }
      },
      { timeout: 10000 }
    );
  };

  // Load saved database records
  const loadRecords = async () => {
    try {
      const data = await fetchRecords();
      setRecords(data);
    } catch (err) {
      console.error("Could not load records:", err);
    }
  };

  // Initial load
  useEffect(() => {
    handleSearch("Oran");
    loadRecords();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-badge">Full Stack Assessment #1 &amp; #2</div>
        <h1 className="app-title">Atmosphere Weather Application</h1>
        <p className="app-subtitle">
          Real-time weather retrieval, 5-day forecasts, and SQLite database persistence
        </p>
      </header>

      <main className="main-content">
        {/* Search Bar & Geolocation */}
        <SearchBar
          onSearch={handleSearch}
          onUseLocation={handleUseLocation}
          loading={loading}
        />

        {/* 1.2 Graceful Error Handling */}
        {errorMessage && (
          <div className="alert-box alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <span>Fetching live weather data...</span>
          </div>
        )}

        {/* Weather Results */}
        {!loading && weather && (
          <div className="weather-dashboard">
            <CurrentWeather weather={weather} />
            <Forecast forecast={forecast} />
          </div>
        )}

        {/* Section 2: SQLite CRUD & Export Persistence */}
        <RecordsSection
          records={records}
          onRecordsChange={loadRecords}
          currentLocationQuery={currentQuery}
        />
      </main>

      <Footer />
    </div>
  );
}

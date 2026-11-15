import React from "react";

export function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

export default function CurrentWeather({ weather }) {
  if (!weather) return null;

  const icon = getWeatherIcon(weather.weather_code);
  const formattedTime = weather.time ? weather.time.replace("T", " ") : "";

  return (
    <div className="card current-weather-card">
      <div className="current-header">
        <div>
          <span className="section-tag">Current Conditions</span>
          <h2 className="location-title">{weather.location}</h2>
          <p className="coordinates-text">
            Lat: {weather.latitude.toFixed(3)}, Lon: {weather.longitude.toFixed(3)}
          </p>
        </div>
        <div className="weather-big-icon" aria-label={weather.condition}>
          {icon}
        </div>
      </div>

      <div className="current-main">
        <div className="temp-display">
          <span className="temp-value">{Math.round(weather.temperature)}</span>
          <span className="temp-unit">°C</span>
        </div>
        <div className="condition-badge">{weather.condition}</div>
      </div>

      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-label">💧 Humidity</span>
          <span className="metric-value">{weather.humidity}%</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">💨 Wind Speed</span>
          <span className="metric-value">{weather.wind_speed} km/h</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">🕒 Local Time</span>
          <span className="metric-value">{formattedTime || "Real-time"}</span>
        </div>
      </div>
    </div>
  );
}

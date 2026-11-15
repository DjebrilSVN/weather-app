import React from "react";
import { getWeatherIcon } from "./CurrentWeather.jsx";

function formatDayName(dateString, index) {
  if (index === 0) return "Today";
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatDate(dateString) {
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Forecast({ forecast }) {
  if (!forecast || !forecast.days || forecast.days.length === 0) return null;

  return (
    <div className="card forecast-card">
      <div className="card-header">
        <h3 className="card-title">📅 5-Day Weather Forecast</h3>
        <span className="card-subtitle">Daily projections &amp; precipitation</span>
      </div>

      <div className="forecast-grid">
        {forecast.days.map((day, index) => {
          const icon = getWeatherIcon(day.weather_code);
          return (
            <div key={day.date} className="forecast-day-item">
              <div className="forecast-day-header">
                <span className="day-name">{formatDayName(day.date, index)}</span>
                <span className="day-date">{formatDate(day.date)}</span>
              </div>

              <div className="forecast-icon">{icon}</div>

              <div className="forecast-condition">{day.condition}</div>

              <div className="forecast-temps">
                <span className="max-temp">{Math.round(day.max_temp)}°</span>
                <span className="min-temp">{Math.round(day.min_temp)}°</span>
              </div>

              {day.rain_chance !== null && (
                <div className="forecast-rain">
                  <span>🌧️ {day.rain_chance}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

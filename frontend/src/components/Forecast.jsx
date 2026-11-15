import React from "react";
import { WeatherIcon } from "./CurrentWeather.jsx";

const RainDropIcon = () => (
    <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}
    >
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
);

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
            <div className="card-top">
                <div>
                    <span className="badge">Outlook</span>
                    <h3 className="section-title">5-Day Weather Forecast</h3>
                </div>
            </div>

            <div className="forecast-grid">
                {forecast.days.map((day, index) => (
                    <div key={day.date} className="forecast-item">
                        <div className="forecast-day-name">{formatDayName(day.date, index)}</div>
                        <div className="forecast-date">{formatDate(day.date)}</div>

                        <div className="forecast-icon">
                            <WeatherIcon code={day.weather_code} size={36} />
                        </div>

                        <div className="forecast-condition">{day.condition}</div>

                        <div className="forecast-temps">
                            <span className="temp-high">{Math.round(day.max_temp)}°</span>
                            <span className="temp-low">{Math.round(day.min_temp)}°</span>
                        </div>

                        {day.rain_chance > 0 && (
                            <div className="forecast-rain">
                                <RainDropIcon />
                                <span>{day.rain_chance}%</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
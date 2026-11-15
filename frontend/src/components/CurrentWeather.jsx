import React from "react";

export function WeatherIcon({ code, size = 48 }) {
    // Clear Sky
    if (code === 0) {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" fill="#fef3c7" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
        );
    }

    // Partly Cloudy
    if (code === 1 || code === 2) {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41" stroke="#f59e0b" />
                <path d="M17.5 19H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11 1.9 4 4 0 0 1-1.5 8z" fill="#eff6ff" />
            </svg>
        );
    }

    // Fog
    if (code === 45 || code === 48) {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="8" x2="20" y2="8" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="6" y1="16" x2="18" y2="16" />
            </svg>
        );
    }

    // Rain / Drizzle
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 14H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11 1.9 4 4 0 0 1-1.5 8z" fill="#eff6ff" />
                <line x1="8" y1="17" x2="8" y2="21" stroke="#60a5fa" />
                <line x1="12" y1="17" x2="12" y2="21" stroke="#60a5fa" />
                <line x1="16" y1="17" x2="16" y2="21" stroke="#60a5fa" />
            </svg>
        );
    }

    // Snow
    if (code >= 71 && code <= 77) {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 14H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11 1.9 4 4 0 0 1-1.5 8z" fill="#f0f9ff" />
                <line x1="8" y1="18" x2="8" y2="18.01" strokeWidth="3" />
                <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="3" />
                <line x1="16" y1="18" x2="16" y2="18.01" strokeWidth="3" />
            </svg>
        );
    }

    // Thunderstorm
    if (code >= 95) {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 13H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11 1.9 4 4 0 0 1-1.5 8z" fill="#e0e7ff" />
                <polyline points="13 13 11 17 14 17 12 21" stroke="#f59e0b" fill="#fef08a" />
            </svg>
        );
    }

    // Default: Overcast / Cloudy
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11 1.9 4 4 0 0 1-1.5 8z" fill="#f1f5f9" />
        </svg>
    );
}

// --- Small Metric Icons ---
const DropletIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
);

const WindIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
        <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
        <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
);

const ClockIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);


// --- Main Component ---
export default function CurrentWeather({ weather }) {
    if (!weather) return null;

    const formattedTime = weather.time ? weather.time.replace("T", " ") : "Now";

    return (
        <div className="card current-card">
            <div className="card-top">
                <div>
                    <span className="badge">Current Weather</span>
                    <h2 className="location-name">{weather.location}</h2>
                    <p className="coords-text">
                        Lat: {weather.latitude.toFixed(2)}, Lon: {weather.longitude.toFixed(2)}
                    </p>
                </div>
                <div className="weather-icon-large">
                    <WeatherIcon code={weather.weather_code} size={54} />
                </div>
            </div>

            <div className="temp-row">
                <span className="temp-val">{Math.round(weather.temperature)}</span>
                <span className="temp-deg">°C</span>
                <span className="condition-tag">{weather.condition}</span>
            </div>

            <div className="details-grid">
                <div className="detail-box">
                    <span className="detail-label">
                        <DropletIcon /> Humidity
                    </span>
                    <span className="detail-val">{weather.humidity}%</span>
                </div>
                <div className="detail-box">
                    <span className="detail-label">
                        <WindIcon /> Wind
                    </span>
                    <span className="detail-val">{weather.wind_speed} km/h</span>
                </div>
                <div className="detail-box">
                    <span className="detail-label">
                        <ClockIcon /> Local Time
                    </span>
                    <span className="detail-val">{formattedTime}</span>
                </div>
            </div>
        </div>
    );
}
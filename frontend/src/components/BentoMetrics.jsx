import { useId } from "react";
import {
  AirIcon,
  DropletIcon,
  GaugeIcon,
  RainIcon,
  SunIcon,
  SunriseIcon,
  WindIcon,
} from "./WeatherIcons.jsx";

function uvInfo(uv) {
  const v = Number(uv ?? 0);
  if (v < 3) return { label: "Low", pct: (v / 11) * 100 };
  if (v < 6) return { label: "Moderate", pct: (v / 11) * 100 };
  if (v < 8) return { label: "High", pct: (v / 11) * 100 };
  if (v < 11) return { label: "Very High", pct: (v / 11) * 100 };
  return { label: "Extreme", pct: 100 };
}

function aqiInfo(aqi) {
  const v = Number(aqi ?? 0);
  if (v <= 50) return { label: "Good · Low Health Risk", pct: Math.max(6, (v / 300) * 100) };
  if (v <= 100) return { label: "Moderate", pct: (v / 300) * 100 };
  if (v <= 150) return { label: "Sensitive Groups", pct: (v / 300) * 100 };
  if (v <= 200) return { label: "Unhealthy", pct: (v / 300) * 100 };
  return { label: "Very Unhealthy", pct: Math.min(100, (v / 300) * 100) };
}

function compassDir(deg) {
  if (deg == null) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

function formatClock(iso) {
  if (!iso) return "—";
  const [hStr, mStr] = iso.slice(11, 16).split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${suffix}`;
}

function minutesOfDay(iso) {
  if (!iso) return 0;
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return h * 60 + m;
}

export function BentoMetrics({ current, today, airQuality }) {
  const uid = useId().replace(/:/g, "");
  const uv = uvInfo(current.uv_index);
  const aqiVal = airQuality?.us_aqi;
  const aqi = aqiInfo(aqiVal);

  // Solar arc calculation
  const nowMin = minutesOfDay(current.time);
  const riseMin = minutesOfDay(today?.sunrise) || 390;
  const setMin = minutesOfDay(today?.sunset) || 1080;
  const rawProgress = (nowMin - riseMin) / Math.max(1, setMin - riseMin);
  const dayProgress = Math.max(0, Math.min(1, rawProgress));
  const isSunUp = rawProgress >= 0 && rawProgress <= 1;

  // Point on quadratic Bezier M 12 68 Q 90 6 168 68
  const t = dayProgress;
  const sunX = (1 - t) * (1 - t) * 12 + 2 * (1 - t) * t * 90 + t * t * 168;
  const sunY = (1 - t) * (1 - t) * 68 + 2 * (1 - t) * t * 6 + t * t * 68;

  // Pressure dial calculation (960 - 1040 hPa)
  const pressure = Number(current.surface_pressure ?? 1013);
  const pNorm = Math.max(0, Math.min(1, (pressure - 960) / 80));
  const pLabel = pressure > 1020 ? "High" : pressure < 1000 ? "Low" : "Steady";

  const windDeg = Number(current.wind_direction_10m ?? 0);

  return (
    <section className="bento-grid" aria-label="Detailed atmospheric metrics">
      {/* 1. Air Quality (Wide Card) */}
      <article className="glass-card bento-card bento-wide">
        <div className="bento-label">
          <AirIcon />
          <span>AIR QUALITY</span>
        </div>
        <div className="bento-aqi-row">
          <div>
            <p className="bento-big">
              {aqiVal != null ? `${aqiVal} — ${aqi.label}` : "Unavailable"}
            </p>
            {airQuality && (
              <p className="bento-desc">
                EU AQI {airQuality.european_aqi ?? "—"} · PM2.5 {airQuality.pm2_5 ?? "—"} µg/m³ · PM10{" "}
                {airQuality.pm10 ?? "—"} µg/m³
              </p>
            )}
          </div>
        </div>
        <div className="gradient-meter" aria-hidden="true">
          <div className="gradient-track aqi-grad">
            <span className="meter-dot" style={{ left: `${Math.min(97, Math.max(3, aqi.pct))}%` }} />
          </div>
        </div>
      </article>

      {/* 2. UV Index */}
      <article className="glass-card bento-card">
        <div className="bento-label">
          <SunIcon />
          <span>UV INDEX</span>
        </div>
        <p className="bento-value">{Number(current.uv_index ?? 0).toFixed(1)}</p>
        <p className="bento-sub">
          {uv.label} {today?.uv_max != null ? `· Peak ${Number(today.uv_max).toFixed(1)}` : ""}
        </p>
        <div className="gradient-meter" aria-hidden="true">
          <div className="gradient-track uv-grad">
            <span className="meter-dot" style={{ left: `${Math.min(96, Math.max(4, uv.pct))}%` }} />
          </div>
        </div>
      </article>

      {/* 3. Sunrise & Sunset with Solar Arc SVG */}
      <article className="glass-card bento-card">
        <div className="bento-label">
          <SunriseIcon />
          <span>SUNRISE</span>
        </div>
        <p className="bento-value">{formatClock(today?.sunrise)}</p>
        <svg className="solar-svg" viewBox="0 0 180 82" aria-hidden="true">
          <defs>
            <linearGradient id={`solar-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#ffd166" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <line x1="8" y1="62" x2="172" y2="62" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
          <path
            d="M 12 68 Q 90 6 168 68"
            fill="none"
            stroke={`url(#solar-${uid})`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {isSunUp && (
            <>
              <circle cx={sunX} cy={sunY} r="9" fill="#ffd166" opacity="0.28" />
              <circle cx={sunX} cy={sunY} r="4.5" fill="#fff7cc" stroke="#ffb703" strokeWidth="1.5" />
            </>
          )}
        </svg>
        <p className="bento-foot">Sunset: {formatClock(today?.sunset)}</p>
      </article>

      {/* 4. Wind Compass SVG */}
      <article className="glass-card bento-card">
        <div className="bento-label">
          <WindIcon />
          <span>WIND</span>
        </div>
        <div className="compass-wrap">
          <svg className="compass-svg" viewBox="0 0 110 110" aria-hidden="true">
            <circle
              cx="55"
              cy="55"
              r="46"
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(255,255,255,0.16)"
              strokeDasharray="2 4"
              strokeWidth="2"
            />
            <text x="55" y="18" textAnchor="middle" fill="#9cb8d9" fontSize="10" fontWeight="700">
              N
            </text>
            <text x="95" y="59" textAnchor="middle" fill="#9cb8d9" fontSize="10" fontWeight="700">
              E
            </text>
            <text x="55" y="100" textAnchor="middle" fill="#9cb8d9" fontSize="10" fontWeight="700">
              S
            </text>
            <text x="15" y="59" textAnchor="middle" fill="#9cb8d9" fontSize="10" fontWeight="700">
              W
            </text>
            <g transform={`rotate(${windDeg} 55 55)`}>
              <line x1="55" y1="78" x2="55" y2="25" stroke="#58d5ff" strokeWidth="2.5" strokeLinecap="round" />
              <polygon points="55,19 50,29 60,29" fill="#58d5ff" />
            </g>
            <circle cx="55" cy="55" r="18" fill="#0d223f" stroke="rgba(255,255,255,0.15)" />
            <text x="55" y="53" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">
              {Math.round(current.wind_speed_10m ?? 0)}
            </text>
            <text x="55" y="65" textAnchor="middle" fill="#9cb8d9" fontSize="8">
              km/h
            </text>
          </svg>
        </div>
        <p className="bento-foot">
          {compassDir(windDeg)} ({windDeg}°) · Gusts {Math.round(current.wind_gusts_10m ?? 0)} km/h
        </p>
      </article>

      {/* 5. Rainfall */}
      <article className="glass-card bento-card">
        <div className="bento-label">
          <RainIcon />
          <span>RAINFALL</span>
        </div>
        <p className="bento-value">{Number(current.rain ?? current.precipitation ?? 0).toFixed(1)} mm</p>
        <p className="bento-sub">in current interval</p>
        <p className="bento-foot">
          {today?.rain_sum != null ? `${Number(today.rain_sum).toFixed(1)} mm expected today` : "—"}
          {today?.rain_chance != null ? ` (${today.rain_chance}% chance)` : ""}
        </p>
      </article>

      {/* 6. Humidity & Dew Point */}
      <article className="glass-card bento-card">
        <div className="bento-label">
          <DropletIcon />
          <span>HUMIDITY</span>
        </div>
        <p className="bento-value">{current.relative_humidity_2m}%</p>
        <div className="mini-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(0, current.relative_humidity_2m ?? 0))}%` }} />
        </div>
        <p className="bento-foot">
          Dew point is {current.dew_point_2m != null ? `${Math.round(current.dew_point_2m)}°C` : "—"} right now.
        </p>
      </article>

      {/* 7. Pressure Gauge SVG */}
      <article className="glass-card bento-card">
        <div className="bento-label">
          <GaugeIcon />
          <span>PRESSURE</span>
        </div>
        <div className="pressure-wrap">
          <svg className="pressure-svg" viewBox="0 0 120 88" aria-hidden="true">
            {Array.from({ length: 21 }).map((_, i) => {
              const frac = i / 20;
              const angle = (-210 + frac * 240) * (Math.PI / 180);
              const cx = 60;
              const cy = 56;
              const x1 = cx + Math.cos(angle) * 34;
              const y1 = cy + Math.sin(angle) * 34;
              const x2 = cx + Math.cos(angle) * 42;
              const y2 = cy + Math.sin(angle) * 42;
              const active = frac <= pNorm;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={active ? "#58d5ff" : "rgba(255,255,255,0.18)"}
                  strokeWidth={active ? "2.4" : "1.8"}
                  strokeLinecap="round"
                />
              );
            })}
            <text x="60" y="55" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">
              {Math.round(pressure)}
            </text>
            <text x="60" y="69" textAnchor="middle" fill="#9cb8d9" fontSize="9.5">
              hPa
            </text>
          </svg>
        </div>
        <p className="bento-foot">{pLabel} atmospheric pressure</p>
      </article>
    </section>
  );
}


import { useId, useMemo, useState } from "react";
import { WeatherIcon } from "./WeatherIcons.jsx";

const METRICS = [
  { key: "temp", label: "Temperature", unit: "°C", color: "#ffbe55", color2: "#ff7c5c" },
  { key: "humidity", label: "Humidity", unit: "%", color: "#58d5ff", color2: "#3b82f6" },
  { key: "rain_chance", label: "Rain Chance", unit: "%", color: "#6ee7ff", color2: "#818cf8" },
  { key: "uv_index", label: "UV Index", unit: "", color: "#e879f9", color2: "#f59e0b" },
];

function formatHour(iso) {
  return iso.slice(11, 16);
}

function dayChipLabel(dateStr, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return new Date(dateStr + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" });
}

/** Smooth cubic Bezier path through points (Catmull-Rom -> Bezier). */
function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function HourlyChart({ hourly = [], days = [], currentTime }) {
  const uid = useId().replace(/:/g, "");
  const [metricKey, setMetricKey] = useState("temp");
  const [rangeMode, setRangeMode] = useState("next24"); // "next24" | date string
  const [activeIdx, setActiveIdx] = useState(0);

  const slice = useMemo(() => {
    if (!hourly.length) return [];
    if (rangeMode === "next24") {
      const currentHourKey = currentTime ? currentTime.slice(0, 13) : hourly[0].time.slice(0, 13);
      const startIdx = Math.max(
        0,
        hourly.findIndex((h) => h.time.slice(0, 13) >= currentHourKey)
      );
      return hourly.slice(startIdx, startIdx + 24);
    }
    return hourly.filter((h) => h.time.startsWith(rangeMode));
  }, [hourly, rangeMode, currentTime]);

  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];
  const safeIdx = Math.min(activeIdx, Math.max(0, slice.length - 1));
  const activeHour = slice[safeIdx];

  // SVG coordinate system
  const W = 720;
  const H = 178;
  const PAD_L = 36;
  const PAD_R = 18;
  const PAD_T = 26;
  const PAD_B = 28;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const { points, minVal, maxVal, midVal, linePath, areaPath } = useMemo(() => {
    if (!slice.length) {
      return { points: [], minVal: 0, maxVal: 10, midVal: 5, linePath: "", areaPath: "" };
    }
    const vals = slice.map((h) => Number(h[metric.key] ?? 0));
    let rawMin = Math.min(...vals);
    let rawMax = Math.max(...vals);

    if (metric.key === "humidity" || metric.key === "rain_chance") {
      rawMin = Math.max(0, Math.floor(rawMin / 10) * 10 - 10);
      rawMax = Math.min(100, Math.ceil(rawMax / 10) * 10 + 10);
    } else if (metric.key === "uv_index") {
      rawMin = 0;
      rawMax = Math.max(4, Math.ceil(rawMax + 1));
    } else {
      rawMin = Math.floor(rawMin - 1);
      rawMax = Math.ceil(rawMax + 1);
    }
    if (rawMax === rawMin) rawMax = rawMin + 2;

    const pts = slice.map((h, i) => {
      const v = Number(h[metric.key] ?? 0);
      const x = PAD_L + (slice.length === 1 ? plotW / 2 : (i / (slice.length - 1)) * plotW);
      const y = PAD_T + plotH - ((v - rawMin) / (rawMax - rawMin)) * plotH;
      return { x, y, val: v, hour: h };
    });

    const lp = smoothPath(pts);
    const baseY = PAD_T + plotH;
    const ap = pts.length
      ? `${lp} L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`
      : "";

    return {
      points: pts,
      minVal: rawMin,
      maxVal: rawMax,
      midVal: Math.round((rawMin + rawMax) / 2),
      linePath: lp,
      areaPath: ap,
    };
  }, [slice, metric.key, plotW, plotH]);

  if (!slice.length) return null;

  const strokeGradId = `stroke-${uid}`;
  const areaGradId = `area-${uid}`;
  const activePt = points[safeIdx];

  const formatVal = (v) =>
    metric.key === "uv_index" ? Number(v).toFixed(1) : `${Math.round(v)}${metric.unit}`;

  return (
    <section className="glass-card hourly-panel" aria-label="Hourly forecast and trends">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Hourly Forecast &amp; Trends</h2>
          <p className="panel-sub">
            {activeHour
              ? `${formatHour(activeHour.time)} · ${activeHour.description} · ${formatVal(activeHour[metric.key] ?? 0)}`
              : "24-hour outlook"}
          </p>
        </div>

        <div className="pill-tabs" role="tablist" aria-label="Time range">
          <button
            type="button"
            role="tab"
            aria-selected={rangeMode === "next24"}
            className={rangeMode === "next24" ? "pill active" : "pill"}
            onClick={() => {
              setRangeMode("next24");
              setActiveIdx(0);
            }}
          >
            Next 24h
          </button>
          {days.slice(0, 5).map((d, i) => (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={rangeMode === d.date}
              className={rangeMode === d.date ? "pill active" : "pill"}
              onClick={() => {
                setRangeMode(d.date);
                setActiveIdx(0);
              }}
            >
              {dayChipLabel(d.date, i)}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Hourly Cards Strip */}
      <ol className="hourly-strip" aria-label="Hourly weather cards">
        {slice.map((h, i) => {
          const selected = i === safeIdx;
          return (
            <li key={h.time}>
              <button
                type="button"
                className={selected ? "hour-card active" : "hour-card"}
                onClick={() => setActiveIdx(i)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className="hour-time">{i === 0 && rangeMode === "next24" ? "Now" : formatHour(h.time)}</span>
                <WeatherIcon code={h.weather_code} isDay={h.is_day} size={34} />
                <span className="hour-temp">{Math.round(h.temp)}°</span>
                <span className="hour-rain">
                  {h.rain_chance > 0 ? `${h.rain_chance}%` : " "}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Metric Tabs + Smooth SVG Graph */}
      <div className="graph-wrap">
        <div className="graph-toolbar">
          <div className="metric-tabs" role="tablist" aria-label="Graph metric">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={metricKey === m.key}
                className={metricKey === m.key ? "metric-btn active" : "metric-btn"}
                onClick={() => setMetricKey(m.key)}
              >
                <span className="metric-dot" style={{ background: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
          {activeHour && (
            <div className="graph-readout">
              <span>{formatHour(activeHour.time)}</span>
              <strong>{formatVal(activeHour[metric.key] ?? 0)}</strong>
              <span className="readout-extra">
                Humidity {activeHour.humidity}% · UV {Number(activeHour.uv_index ?? 0).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <svg
          className="trend-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Hourly ${metric.label} line graph`}
        >
          <defs>
            <linearGradient id={strokeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={metric.color} />
              <stop offset="100%" stopColor={metric.color2} />
            </linearGradient>
            <linearGradient id={areaGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={metric.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={metric.color2} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y Labels */}
          {[
            { val: maxVal, y: PAD_T },
            { val: midVal, y: PAD_T + plotH / 2 },
            { val: minVal, y: PAD_T + plotH },
          ].map((g, idx) => (
            <g key={idx}>
              <line
                x1={PAD_L}
                y1={g.y}
                x2={W - PAD_R}
                y2={g.y}
                stroke="rgba(255,255,255,0.09)"
                strokeDasharray="4 4"
              />
              <text
                x={PAD_L - 8}
                y={g.y + 4}
                textAnchor="end"
                fill="rgba(205,222,245,0.58)"
                fontSize="11"
              >
                {g.val}
                {metric.unit}
              </text>
            </g>
          ))}

          {/* Area & Smooth Curve */}
          {areaPath && <path d={areaPath} fill={`url(#${areaGradId})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={`url(#${strokeGradId})`}
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* X-axis ticks every 3 hours */}
          {points.map((pt, i) =>
            i % 3 === 0 || i === points.length - 1 ? (
              <text
                key={pt.hour.time}
                x={pt.x}
                y={H - 7}
                textAnchor="middle"
                fill="rgba(205,222,245,0.6)"
                fontSize="11"
              >
                {formatHour(pt.hour.time)}
              </text>
            ) : null
          )}

          {/* Active vertical guide + highlight dot */}
          {activePt && (
            <g>
              <line
                x1={activePt.x}
                y1={PAD_T}
                x2={activePt.x}
                y2={PAD_T + plotH}
                stroke="rgba(255,255,255,0.22)"
                strokeDasharray="3 3"
              />
              <circle cx={activePt.x} cy={activePt.y} r="9" fill={metric.color} opacity="0.25" />
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r="4.5"
                fill="#ffffff"
                stroke={metric.color}
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Invisible hit targets for effortless hover/click */}
          {points.map((pt, i) => (
            <rect
              key={pt.hour.time}
              x={pt.x - plotW / Math.max(points.length * 2, 2)}
              y={PAD_T - 10}
              width={plotW / Math.max(points.length, 1)}
              height={plotH + 20}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => setActiveIdx(i)}
            />
          ))}
        </svg>
      </div>
    </section>
  );
}


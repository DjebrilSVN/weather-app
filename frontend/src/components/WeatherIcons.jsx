import { useId } from "react";

/**
 * Layered, glossy gradient SVG weather icons inspired by modern 3D weather UI.
 * Uses React useId() so gradient IDs stay unique across multiple instances.
 */
export function WeatherIcon({ code, isDay = 1, size = 48, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const sunId = `sun-${uid}`;
  const moonId = `moon-${uid}`;
  const cloudId = `cloud-${uid}`;
  const darkCloudId = `dcloud-${uid}`;
  const dropId = `drop-${uid}`;
  const boltId = `bolt-${uid}`;

  const c = Number(code ?? 0);
  const day = Boolean(isDay);

  const isClear = c === 0;
  const isPartly = c === 1 || c === 2;
  const isOvercast = c === 3;
  const isFog = c === 45 || c === 48;
  const isDrizzle = c >= 51 && c <= 57;
  const isRain = (c >= 61 && c <= 67) || (c >= 80 && c <= 82);
  const isSnow = (c >= 71 && c <= 77) || c === 85 || c === 86;
  const isStorm = c >= 95;

  const Defs = () => (
    <defs>
      <radialGradient id={sunId} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fff3a8" />
        <stop offset="50%" stopColor="#ffc93c" />
        <stop offset="100%" stopColor="#ff8c24" />
      </radialGradient>
      <linearGradient id={moonId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d8e3ff" />
        <stop offset="100%" stopColor="#7f9cf5" />
      </linearGradient>
      <linearGradient id={cloudId} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#e4eefb" />
        <stop offset="100%" stopColor="#b7cde6" />
      </linearGradient>
      <linearGradient id={darkCloudId} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#c3d4ea" />
        <stop offset="100%" stopColor="#7892b5" />
      </linearGradient>
      <linearGradient id={dropId} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#7ee8ff" />
        <stop offset="100%" stopColor="#1e88e5" />
      </linearGradient>
      <linearGradient id={boltId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffe566" />
        <stop offset="100%" stopColor="#ff9100" />
      </linearGradient>
    </defs>
  );

  const SunOrb = ({ cx = 32, cy = 32, r = 14, rays = true }) => (
    <g>
      <circle cx={cx} cy={cy} r={r + 4} fill={`url(#${sunId})`} opacity="0.22" />
      {rays &&
        [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = cx + Math.cos(rad) * (r + 3);
          const y1 = cy + Math.sin(rad) * (r + 3);
          const x2 = cx + Math.cos(rad) * (r + 7);
          const y2 = cy + Math.sin(rad) * (r + 7);
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#ffd04d"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          );
        })}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${sunId})`} />
    </g>
  );

  const MoonCrescent = ({ cx = 34, cy = 30, scale = 1 }) => (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      <path
        d="M-2 -14A14 14 0 1 0 13 6A11 11 0 0 1 -2 -14Z"
        fill={`url(#${moonId})`}
      />
      <circle cx="10" cy="-9" r="1.6" fill="#d8e3ff" opacity="0.9" />
      <circle cx="-13" cy="-6" r="1.2" fill="#d8e3ff" opacity="0.7" />
    </g>
  );

  const CloudShape = ({ dark = false, yOffset = 0 }) => (
    <path
      transform={`translate(0, ${yOffset})`}
      d="M19 46h26a9.5 9.5 0 0 0 1.4-18.9A12.5 12.5 0 0 0 22.8 25a8.5 8.5 0 0 0-3.8 16.5"
      fill={`url(#${dark ? darkCloudId : cloudId})`}
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="0.8"
    />
  );

  const CloudClean = ({ dark = false, yOffset = 0 }) => (
    <path
      transform={`translate(0, ${yOffset})`}
      d="M20 45h25a9 9 0 0 0 1.3-17.9A12 12 0 0 0 23.2 24.5a8.5 8.5 0 0 0-3.2 20.5Z"
      fill={`url(#${dark ? darkCloudId : cloudId})`}
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="0.75"
    />
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <Defs />

      {isClear && (day ? <SunOrb cx={32} cy={32} r={14} /> : <MoonCrescent cx={34} cy={33} scale={1.18} />)}

      {isPartly && (
        <>
          {day ? <SunOrb cx={23} cy={24} r={10} rays={false} /> : <MoonCrescent cx={22} cy={22} scale={0.9} />}
          <CloudClean yOffset={2} />
        </>
      )}

      {isOvercast && (
        <>
          <g transform="translate(8, -6) scale(0.82)" opacity="0.72">
            <CloudClean dark />
          </g>
          <CloudClean yOffset={2} />
        </>
      )}

      {isFog && (
        <>
          <CloudClean dark yOffset={-4} />
          <line x1="15" y1="47" x2="49" y2="47" stroke="#b9d1ea" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <line x1="20" y1="53" x2="44" y2="53" stroke="#9cb9db" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
        </>
      )}

      {(isDrizzle || isRain) && (
        <>
          {isDrizzle && day && <SunOrb cx={22} cy={22} r={8.5} rays={false} />}
          <CloudClean dark={isRain} yOffset={-3} />
          {[22, 31, 40].map((x, idx) => (
            <path
              key={x}
              d={`M${x} ${45 + (idx % 2) * 2}c0 0-3 4.2-3 6.2a3 3 0 0 0 6 0c0-2-3-6.2-3-6.2Z`}
              fill={`url(#${dropId})`}
            />
          ))}
        </>
      )}

      {isSnow && (
        <>
          <CloudClean yOffset={-3} />
          {[22, 32, 42].map((x, idx) => (
            <g key={x} transform={`translate(${x}, ${49 + (idx % 2) * 3})`}>
              <circle cx="0" cy="0" r="2.6" fill="#e6f4ff" />
              <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#bae0ff" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#bae0ff" strokeWidth="1.3" strokeLinecap="round" />
            </g>
          ))}
        </>
      )}

      {isStorm && (
        <>
          <CloudClean dark yOffset={-4} />
          <path
            d="M34 39l-6 10h6l-3 10 10-13h-6l4-7Z"
            fill={`url(#${boltId})`}
            stroke="#fff4b8"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <path d="M21 46c0 0-2.4 3.5-2.4 5a2.4 2.4 0 0 0 4.8 0c0-1.5-2.4-5-2.4-5Z" fill={`url(#${dropId})`} />
        </>
      )}

      {!isClear && !isPartly && !isOvercast && !isFog && !isDrizzle && !isRain && !isSnow && !isStorm && (
        <CloudShape />
      )}
    </svg>
  );
}

/* ---------- Clean UI Line SVG Icons ---------- */

export function SearchIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function PinIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function WindIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

export function DropletIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

export function RainIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2" />
      <path d="M8 19v2M12 17v4M16 19v2" />
    </svg>
  );
}

export function SunIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function SunriseIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v8M5.2 10.2l1.4 1.4M2 18h20M18.8 10.2l-1.4 1.4M8 6l4-4 4 4" />
      <path d="M16 18a4 4 0 0 0-8 0" />
    </svg>
  );
}

export function GaugeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 14l4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  );
}

export function AirIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h13a3 3 0 1 0-3-3" />
      <path d="M3 12h16a3 3 0 1 1-3 3" />
      <path d="M3 16h9a2.5 2.5 0 1 1-2.5 2.5" />
    </svg>
  );
}

export function CalendarIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function DownloadIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function TrashIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function EditIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function MapIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

export function VideoIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <polygon points="10 9 16 12 10 15 10 9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function InfoIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}


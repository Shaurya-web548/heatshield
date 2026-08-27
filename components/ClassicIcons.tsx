"use client";

import type { CSSProperties } from "react";

type IconProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
};

const defaults = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** 🌡️ — Thermometer */
export function ThermometerIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" />
      <circle cx="11.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      <line x1="11.5" y1="14" x2="11.5" y2="7" />
    </svg>
  );
}

/** 🔥 — Flame */
export function FlameIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10Z" />
      <path d="M12 22c-1.66 0-3-1.12-3-2.5S10.34 17 12 17s3 1.12 3 2.5S13.66 22 12 22Z" />
    </svg>
  );
}

/** 🔔 — Bell */
export function BellIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/** 🛡️ — Shield */
export function ShieldIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

/** 📐 — Ruler / HRI index */
export function RulerIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M21 3 3 21" />
      <path d="M21 3h-6v6" />
      <path d="M6.5 14.5 9 12" />
      <path d="M10.5 10.5 12 9" />
      <path d="M14.5 6.5 12 9" />
    </svg>
  );
}

/** 💧 — Water droplet */
export function DropletIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0Z" />
    </svg>
  );
}

/** ⛱️ — Umbrella / shade */
export function UmbrellaIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M23 12a11.05 11.05 0 0 0-22 0" />
      <path d="M12 12v9a3 3 0 0 0 6 0" />
      <line x1="12" y1="2" x2="12" y2="3" />
    </svg>
  );
}

/** 🧂 — Salt / ORS */
export function SaltIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="16" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** ❄️ — Snowflake / cooling centre */
export function SnowflakeIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** 📍 — Map pin */
export function PinIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** 🏛️ — Town hall / ward office */
export function TownHallIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-4h6v4" />
      <line x1="9" y1="10" x2="9" y2="14" />
      <line x1="15" y1="10" x2="15" y2="14" />
    </svg>
  );
}

/** 🏥 — Hospital / health centre */
export function HospitalIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

/** 🚦 — Traffic light */
export function TrafficIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <rect x="8" y="2" width="8" height="20" rx="2" />
      <circle cx="12" cy="7" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="17" r="1.5" />
    </svg>
  );
}

/** 📋 — Clipboard / table */
export function ClipboardIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="16" y2="16" />
    </svg>
  );
}

/** 🏠 — Home / resident */
export function HomeIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

/** ⬇️ — Download */
export function DownloadIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...defaults(size)} className={className} style={style}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/** Pulsing live dot indicator */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={`live-dot-wrap ${className ?? ""}`}>
      <span className="live-dot" />
    </span>
  );
}

/* ── SVG strings for Leaflet DivIcon markers (not React components) ── */

export const PIN_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

export const COOLING_SVG: Record<string, string> = {
  water: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0Z"/></svg>`,
  shade: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 12a11.05 11.05 0 0 0-22 0"/><path d="M12 12v9a3 3 0 0 0 6 0"/><line x1="12" y1="2" x2="12" y2="3"/></svg>`,
  ors: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="4" width="10" height="16" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/></svg>`,
  centre: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`,
};

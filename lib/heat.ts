// Localized Heat-Risk Index (HRI). Deliberately simple and explainable:
// IMD heat index (air temp + humidity) + urban surface adjustments + exposure.
// A communication/decision-support model, not a meteorological one.

import type { City, Zone, ZoneFactors } from "@/data/cities";
import { distanceKm, type LatLng } from "@/lib/geo";

export const DAY_START = 6; // 06:00
export const DAY_END = 20; // 20:00

export type RiskLevel = "NORMAL" | "WATCH" | "ALERT" | "CRITICAL";

export const LEVEL_ORDER: RiskLevel[] = ["NORMAL", "WATCH", "ALERT", "CRITICAL"];

export const LEVEL_COLORS: Record<RiskLevel, string> = {
  NORMAL: "#22c55e",
  WATCH: "#eab308",
  ALERT: "#f97316",
  CRITICAL: "#ef4444",
};

export const THRESHOLDS = { WATCH: 40, ALERT: 60, CRITICAL: 80 };

/** What-if planning parameters (defaults = the IMD snapshot, no greening). */
export type SimParams = {
  tempDeltaC: number; // shift applied to IMD Tmax/Tmin
  humidityDeltaPct: number; // shift applied to morning RH
  greening: Record<string, number>; // zoneId -> added tree-cover fraction
};

export const DEFAULT_PARAMS: SimParams = {
  tempDeltaC: 0,
  humidityDeltaPct: 0,
  greening: {},
};

export const isWhatIfActive = (p: SimParams) =>
  p.tempDeltaC !== 0 ||
  p.humidityDeltaPct !== 0 ||
  Object.values(p.greening).some((g) => g > 0);

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** 0..1 solar/heating profile across the day; peaks ~15:00. */
export function dayProfile(hour: number): number {
  const h = clamp(hour, DAY_START, DAY_END);
  if (h <= 15) return 0.5 * (1 - Math.cos((Math.PI * (h - DAY_START)) / 9));
  return 1 - 0.45 * ((h - 15) / 5);
}

/** IMD-bulletin air temperature at a given hour (diurnal curve). */
export function airTempC(
  city: City,
  hour: number,
  p: SimParams = DEFAULT_PARAMS
): number {
  const { tmaxC, tminC } = city.imd;
  return tminC + p.tempDeltaC + (tmaxC - tminC) * dayProfile(hour);
}

/** Relative humidity falls through the afternoon as air heats. */
export function humidityPct(
  city: City,
  hour: number,
  p: SimParams = DEFAULT_PARAMS
): number {
  return clamp(
    city.imd.humidityPct + p.humidityDeltaPct - 12 * dayProfile(hour),
    8,
    95
  );
}

/** Heat index (feels-like) in °C — Rothfusz regression, valid above ~27 °C. */
export function heatIndexC(tC: number, rh: number): number {
  if (tC < 27) return tC;
  const T = (tC * 9) / 5 + 32;
  const HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * rh -
    0.22475541 * T * rh -
    6.83783e-3 * T * T -
    5.481717e-2 * rh * rh +
    1.22874e-3 * T * T * rh +
    8.5282e-4 * T * rh * rh -
    1.99e-6 * T * T * rh * rh;
  return ((HI - 32) * 5) / 9;
}

export type HriFactor = { label: string; value: string; delta: number };

export type ZoneRisk = {
  zone: Zone;
  hri: number;
  level: RiskLevel;
  airTempC: number;
  feelsLikeC: number; // localized feels-like after urban adjustments
  factors: HriFactor[];
};

/**
 * Urban adjustments (°C) on top of the city-wide heat index. Surfaces and
 * built-up mass heat through the day (profile-weighted); trees cool.
 */
function urbanDeltas(zone: Zone, hour: number) {
  const p = dayProfile(hour);
  const f = zone.factors;
  return {
    builtUp: 3.5 * f.builtUp * (0.6 + 0.4 * p),
    surface: 2.5 * f.surface * p,
    traffic: 1.5 * f.traffic * p,
    trees: -3.0 * f.treeCover * (0.5 + 0.5 * p),
  };
}

export function zoneRisk(
  city: City,
  zoneIn: Zone,
  hour: number,
  p: SimParams = DEFAULT_PARAMS
): ZoneRisk {
  const extra = p.greening[zoneIn.id] ?? 0;
  const zone: Zone =
    extra > 0
      ? {
          ...zoneIn,
          factors: {
            ...zoneIn.factors,
            treeCover: clamp(zoneIn.factors.treeCover + extra, 0, 0.9),
            surface: clamp(zoneIn.factors.surface - extra * 0.5, 0, 1),
          },
        }
      : zoneIn;
  const t = airTempC(city, hour, p);
  const rh = humidityPct(city, hour, p);
  const base = heatIndexC(t, rh);
  const d = urbanDeltas(zone, hour);
  const feelsLike = base + d.builtUp + d.surface + d.traffic + d.trees;

  // 33 °C feels-like -> 0, 52 °C -> 100; exposure adds up to +12 points.
  const thermal = clamp(((feelsLike - 33) / 19) * 100, 0, 100);
  const exposure = 12 * zone.factors.workers;
  const hri = Math.round(clamp(thermal * 0.9 + exposure, 0, 100));

  const level: RiskLevel =
    hri >= THRESHOLDS.CRITICAL
      ? "CRITICAL"
      : hri >= THRESHOLDS.ALERT
        ? "ALERT"
        : hri >= THRESHOLDS.WATCH
          ? "WATCH"
          : "NORMAL";

  const factors: HriFactor[] = [
    { label: "IMD air temperature", value: `${t.toFixed(1)} °C`, delta: 0 },
    { label: "Humidity (heat index)", value: `${rh.toFixed(0)}%`, delta: base - t },
    { label: "Built-up density", value: `${Math.round(zone.factors.builtUp * 100)}%`, delta: d.builtUp },
    { label: "Concrete / asphalt surface", value: `${Math.round(zone.factors.surface * 100)}%`, delta: d.surface },
    { label: "Traffic density", value: `${Math.round(zone.factors.traffic * 100)}%`, delta: d.traffic },
    { label: "Tree cover", value: `${Math.round(zone.factors.treeCover * 100)}%`, delta: d.trees },
  ];

  return { zone, hri, level, airTempC: t, feelsLikeC: feelsLike, factors };
}

/**
 * Risk at an arbitrary point: blend the urban factors of the three nearest
 * zones by inverse-distance weighting, then score like a zone. Lets a vendor
 * or traffic constable check their exact spot.
 */
export function pointRisk(
  city: City,
  point: LatLng,
  hour: number,
  p: SimParams = DEFAULT_PARAMS
): ZoneRisk & { nearest: Zone; distanceKm: number } {
  const ranked = city.zones
    .map((zone) => ({ zone, d: distanceKm(point, zone.center) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  const weights = ranked.map(({ d }) => 1 / Math.max(0.15, d) ** 2);
  const total = weights.reduce((s, w) => s + w, 0);
  const blend = (key: keyof ZoneFactors) =>
    ranked.reduce((s, { zone }, i) => s + zone.factors[key] * weights[i], 0) /
    total;
  const synthetic: Zone = {
    id: "point",
    name: `Point near ${ranked[0].zone.name}`,
    center: point,
    radiusKm: 0,
    population: 0,
    factors: {
      treeCover: blend("treeCover"),
      builtUp: blend("builtUp"),
      traffic: blend("traffic"),
      surface: blend("surface"),
      workers: blend("workers"),
    },
  };
  return {
    ...zoneRisk(city, synthetic, hour, p),
    nearest: ranked[0].zone,
    distanceKm: ranked[0].d,
  };
}

export function cityRisks(
  city: City,
  hour: number,
  p: SimParams = DEFAULT_PARAMS
): ZoneRisk[] {
  return city.zones
    .map((zone) => zoneRisk(city, zone, hour, p))
    .sort((a, b) => b.hri - a.hri);
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

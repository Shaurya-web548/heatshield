// Risk engine: weighted-composite Heat-Risk Index (0–100).
//
//   HRI = Σ wᵢ · nᵢ / Σ wᵢ, each factor nᵢ normalized to 0–100:
//     heat index (IMD temp + humidity), land-surface temp (satellite),
//     tree-cover deficit, built-up density, traffic density,
//     outdoor-worker exposure (optional weight, default 0).
//
// Default weights follow the submission design (0.30 / 0.20 / 0.20 / 0.15 /
// 0.15) and are configurable from the UI — "weights adjustable on
// expert/municipal input". Bands: Low 0–40 · Moderate 41–60 · High 61–80 ·
// Critical 81–100. A decision-support model, not a meteorological one.

import type { City, Zone, ZoneFactors } from "@/data/cities";
import { distanceKm, type LatLng } from "@/lib/geo";

export const DAY_START = 6; // 06:00
export const DAY_END = 20; // 20:00

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export const LEVEL_ORDER: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];

export const LEVEL_COLORS: Record<RiskLevel, string> = {
  LOW: "#22c55e",
  MODERATE: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

/** Band lower bounds (inclusive): 0–40 Low, 41–60 Moderate, 61–80 High, 81–100 Critical. */
export const THRESHOLDS = { MODERATE: 41, HIGH: 61, CRITICAL: 81 };

export const levelFor = (hri: number): RiskLevel =>
  hri >= THRESHOLDS.CRITICAL
    ? "CRITICAL"
    : hri >= THRESHOLDS.HIGH
      ? "HIGH"
      : hri >= THRESHOLDS.MODERATE
        ? "MODERATE"
        : "LOW";

export type FactorKey =
  | "heatIndex"
  | "lst"
  | "treeDeficit"
  | "builtUp"
  | "traffic"
  | "workers";

export type Weights = Record<FactorKey, number>;

export const DEFAULT_WEIGHTS: Weights = {
  heatIndex: 0.3,
  lst: 0.2,
  treeDeficit: 0.2,
  builtUp: 0.15,
  traffic: 0.15,
  workers: 0,
};

export const FACTOR_LABELS: Record<FactorKey, string> = {
  heatIndex: "Heat index (IMD temp + humidity)",
  lst: "Land-surface temperature (satellite)",
  treeDeficit: "Tree-cover deficit (100 − NDVI cover)",
  builtUp: "Built-up density",
  traffic: "Traffic density index",
  workers: "Outdoor-worker exposure",
};

/** What-if planning parameters + configurable weights. */
export type SimParams = {
  tempDeltaC: number; // shift applied to IMD Tmax/Tmin
  humidityDeltaPct: number; // shift applied to morning RH
  greening: Record<string, number>; // zoneId -> added tree-cover fraction
  weights: Weights;
};

export const DEFAULT_PARAMS: SimParams = {
  tempDeltaC: 0,
  humidityDeltaPct: 0,
  greening: {},
  weights: DEFAULT_WEIGHTS,
};

export const isWhatIfActive = (p: SimParams) =>
  p.tempDeltaC !== 0 ||
  p.humidityDeltaPct !== 0 ||
  Object.values(p.greening).some((g) => g > 0);

export const areWeightsCustom = (p: SimParams) =>
  (Object.keys(DEFAULT_WEIGHTS) as FactorKey[]).some(
    (k) => Math.abs(p.weights[k] - DEFAULT_WEIGHTS[k]) > 1e-9
  );

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

/** Apply what-if greening to a zone's factors (more canopy, less sealed surface). */
function effectiveZone(zoneIn: Zone, p: SimParams): Zone {
  const extra = p.greening[zoneIn.id] ?? 0;
  if (extra <= 0) return zoneIn;
  return {
    ...zoneIn,
    factors: {
      ...zoneIn.factors,
      treeCover: clamp(zoneIn.factors.treeCover + extra, 0, 0.9),
      surface: clamp(zoneIn.factors.surface - extra * 0.5, 0, 1),
    },
    statics: {
      ...zoneIn.statics,
      lstOffsetC: Math.max(2, zoneIn.statics.lstOffsetC - extra * 20),
    },
  };
}

/**
 * Land-surface temperature (°C): the satellite-style reading for the zone,
 * air temperature plus a surface offset that scales with solar heating.
 */
export function landSurfaceTempC(
  city: City,
  zone: Zone,
  hour: number,
  p: SimParams = DEFAULT_PARAMS
): number {
  const z = effectiveZone(zone, p);
  return airTempC(city, hour, p) + z.statics.lstOffsetC * dayProfile(hour);
}

export type HriFactor = {
  key: FactorKey;
  label: string;
  value: string; // raw reading for display
  normalized: number; // 0–100
  weight: number;
  points: number; // contribution to HRI
};

export type ZoneRisk = {
  zone: Zone;
  hri: number;
  level: RiskLevel;
  airTempC: number;
  heatIndexC: number; // city-wide feels-like
  feelsLikeC: number; // indicative localized feels-like (display only)
  lstC: number;
  factors: HriFactor[];
};

/** Indicative localized feels-like for display: heat index + urban deltas. */
function localizedFeelsLike(base: number, zone: Zone, hour: number): number {
  const pr = dayProfile(hour);
  const f = zone.factors;
  return (
    base +
    3.5 * f.builtUp * (0.6 + 0.4 * pr) +
    2.5 * f.surface * pr +
    1.5 * f.traffic * pr -
    3.0 * f.treeCover * (0.5 + 0.5 * pr)
  );
}

export function zoneRisk(
  city: City,
  zoneIn: Zone,
  hour: number,
  p: SimParams = DEFAULT_PARAMS
): ZoneRisk {
  const zone = effectiveZone(zoneIn, p);
  const t = airTempC(city, hour, p);
  const rh = humidityPct(city, hour, p);
  const hi = heatIndexC(t, rh);
  const lst = landSurfaceTempC(city, zoneIn, hour, p);

  // Normalize every input to 0–100.
  const n: Record<FactorKey, number> = {
    heatIndex: clamp(((hi - 30) / 20) * 100, 0, 100), // 30 °C → 0, 50 °C → 100
    lst: clamp(((lst - 30) / 30) * 100, 0, 100), // 30 °C → 0, 60 °C → 100
    treeDeficit: (1 - zone.factors.treeCover) * 100,
    builtUp: zone.factors.builtUp * 100,
    traffic: zone.factors.traffic * 100,
    workers: zone.factors.workers * 100,
  };
  const raw: Record<FactorKey, string> = {
    heatIndex: `${hi.toFixed(1)} °C`,
    lst: `${lst.toFixed(1)} °C`,
    treeDeficit: `${Math.round(zone.factors.treeCover * 100)}% cover`,
    builtUp: `${Math.round(zone.factors.builtUp * 100)}%`,
    traffic: `${Math.round(zone.factors.traffic * 100)}%`,
    workers: `${Math.round(zone.factors.workers * 100)}%`,
  };

  const w = p.weights;
  const wSum = (Object.keys(w) as FactorKey[]).reduce((s, k) => s + w[k], 0) || 1;
  const factors: HriFactor[] = (Object.keys(DEFAULT_WEIGHTS) as FactorKey[]).map(
    (k) => ({
      key: k,
      label: FACTOR_LABELS[k],
      value: raw[k],
      normalized: Math.round(n[k]),
      weight: w[k],
      points: (w[k] * n[k]) / wSum,
    })
  );
  const hri = Math.round(clamp(factors.reduce((s, f) => s + f.points, 0), 0, 100));

  return {
    zone,
    hri,
    level: levelFor(hri),
    airTempC: t,
    heatIndexC: hi,
    feelsLikeC: localizedFeelsLike(hi, zone, hour),
    lstC: lst,
    factors,
  };
}

/**
 * Risk at an arbitrary point: blend the three nearest zones by inverse
 * distance, then score like a zone. Lets a vendor or traffic constable
 * check their exact spot.
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
  const blendStatic = (key: "lstOffsetC") =>
    ranked.reduce((s, { zone }, i) => s + zone.statics[key] * weights[i], 0) /
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
    statics: { ...ranked[0].zone.statics, lstOffsetC: blendStatic("lstOffsetC") },
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

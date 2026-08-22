// Layer 1 — Data ingestion.
//
// Each source is an adapter with one method; the snapshot implementations
// return the bundled data. Swapping to a live IMD feed, a daily
// Sentinel/Landsat pull, a municipal GIS export or a traffic API means
// replacing one adapter — the risk engine (lib/heat.ts), storage
// (lib/history.ts, lib/response.ts) and presentation never change.

import { cities, type City, type ImdBulletin, type Zone } from "@/data/cities";

export type Cadence = "hourly" | "daily" | "monthly" | "static";

export type SourceMeta = {
  id: string;
  name: string;
  cadence: Cadence;
  provenance: "snapshot" | "live";
  fields: string[];
  replaceWith: string;
};

export interface ImdSource {
  meta: SourceMeta;
  bulletin(cityId: string): ImdBulletin | null;
}

export interface SatelliteSource {
  meta: SourceMeta;
  /** Land-surface-temperature offset (°C above air at solar peak) and canopy fraction per zone. */
  zoneReading(zone: Zone): { lstOffsetC: number; treeCover: number };
}

export interface GisSource {
  meta: SourceMeta;
  zones(cityId: string): Zone[];
}

export interface TrafficSource {
  meta: SourceMeta;
  congestionIndex(zone: Zone, hour: number): number; // 0..1
}

const cityById = (id: string) => cities.find((c) => c.id === id) ?? null;

export const imdSnapshot: ImdSource = {
  meta: {
    id: "imd",
    name: "IMD bulletin",
    cadence: "hourly",
    provenance: "snapshot",
    fields: ["tmaxC", "tminC", "humidityPct", "windKmh", "level", "colourCode"],
    replaceWith: "IMD district bulletin / API scraper",
  },
  bulletin: (cityId) => cityById(cityId)?.imd ?? null,
};

export const satelliteSnapshot: SatelliteSource = {
  meta: {
    id: "satellite",
    name: "Satellite LST + NDVI",
    cadence: "daily",
    provenance: "snapshot",
    fields: ["lstOffsetC", "treeCover"],
    replaceWith: "Landsat 8/9 thermal (LST) + Sentinel-2 NDVI",
  },
  zoneReading: (zone) => ({
    lstOffsetC: zone.statics.lstOffsetC,
    treeCover: zone.factors.treeCover,
  }),
};

export const gisSnapshot: GisSource = {
  meta: {
    id: "gis",
    name: "Municipal GIS",
    cadence: "static",
    provenance: "snapshot",
    fields: [
      "wardNumber", "builtUp", "surface", "avgBuildingHeightM", "population",
      "informalSettlementPct", "nearestHealthCentreKm", "workers",
    ],
    replaceWith: "Municipal GIS ward layer + Census + vending-committee registers",
  },
  zones: (cityId) => cityById(cityId)?.zones ?? [],
};

export const trafficSnapshot: TrafficSource = {
  meta: {
    id: "traffic",
    name: "Traffic congestion",
    cadence: "hourly",
    provenance: "snapshot",
    fields: ["traffic"],
    replaceWith: "Google/HERE traffic API or traffic-police counts",
  },
  // Static index shaped by a mild rush-hour curve.
  congestionIndex: (zone, hour) => {
    const rush = hour >= 8 && hour <= 11 ? 1 : hour >= 17 && hour <= 20 ? 1 : 0.85;
    return Math.min(1, zone.factors.traffic * rush);
  },
};

export const sources: SourceMeta[] = [
  imdSnapshot.meta,
  satelliteSnapshot.meta,
  gisSnapshot.meta,
  trafficSnapshot.meta,
];

/** Resolve a city through the adapters (identity for the snapshot build). */
export function loadCity(cityId: string): City | null {
  const base = cityById(cityId);
  if (!base) return null;
  const imd = imdSnapshot.bulletin(cityId);
  return imd ? { ...base, imd, zones: gisSnapshot.zones(cityId) } : null;
}

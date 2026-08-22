// Snapshot data — IMD-style bulletin values and representative urban factors.
// Everything is hardcoded: the demo never depends on a live feed.
// Zones are representative hexagonal cells placed on real neighbourhoods,
// not official ward boundaries (stated on screen).

import { distanceKm, type LatLng } from "@/lib/geo";

export type ZoneFactors = {
  treeCover: number; // 0..1 canopy fraction
  builtUp: number; // 0..1 built-up density
  traffic: number; // 0..1 traffic density
  surface: number; // 0..1 impervious concrete/asphalt share
  workers: number; // 0..1 outdoor-worker density (vendors, police, delivery)
};

export type ZoneStatics = {
  wardNumber: string; // representative ward label
  avgBuildingHeightM: number;
  informalSettlementPct: number; // share of households in informal settlements
  nearestHealthCentreKm: number;
  lstOffsetC: number; // satellite land-surface temp above air temp at solar peak (representative)
};

export type Zone = {
  id: string;
  name: string;
  center: LatLng;
  radiusKm: number;
  population: number;
  factors: ZoneFactors;
  statics: ZoneStatics;
};

export type ImdBulletin = {
  date: string;
  tmaxC: number;
  tminC: number;
  humidityPct: number; // morning relative humidity
  windKmh: number;
  level: "Normal" | "Heatwave" | "Severe heatwave";
  colourCode: "Green" | "Yellow" | "Orange" | "Red";
};

export type CoolingKind = "water" | "shade" | "ors" | "centre";

export type CoolingPoint = {
  id: string;
  name: string;
  kind: CoolingKind;
  lat: number;
  lng: number;
};

export const COOLING_ICON: Record<CoolingKind, string> = {
  water: "💧",
  shade: "⛱️",
  ors: "🧂",
  centre: "❄️",
};

export const COOLING_LABEL: Record<CoolingKind, string> = {
  water: "Water kiosk",
  shade: "Shaded rest stop",
  ors: "ORS point",
  centre: "Cooling centre",
};

export type City = {
  id: string;
  name: string;
  state: string;
  center: LatLng;
  zoom: number;
  imd: ImdBulletin;
  zones: Zone[];
  coolingPoints: CoolingPoint[];
  whyHere: string;
};

const cp = (
  id: string,
  name: string,
  kind: CoolingKind,
  lat: number,
  lng: number
): CoolingPoint => ({ id, name, kind, lat, lng });

const z = (
  id: string,
  name: string,
  lat: number,
  lng: number,
  radiusKm: number,
  population: number,
  f: ZoneFactors,
  st: [string, number, number, number, number] // ward, height m, informal %, health km, LST offset
): Zone => ({
  id,
  name,
  center: { lat, lng },
  radiusKm,
  population,
  factors: f,
  statics: {
    wardNumber: st[0],
    avgBuildingHeightM: st[1],
    informalSettlementPct: st[2],
    nearestHealthCentreKm: st[3],
    lstOffsetC: st[4],
  },
});

export const cities: City[] = [
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    state: "Gujarat",
    center: { lat: 23.03, lng: 72.58 },
    zoom: 12,
    imd: {
      date: "18 May",
      tmaxC: 44,
      tminC: 29,
      humidityPct: 28,
      windKmh: 12,
      level: "Heatwave",
      colourCode: "Orange",
    },
    zones: [
      z("maninagar", "Maninagar", 23.0, 72.6, 1.4, 96000, { treeCover: 0.08, builtUp: 0.85, traffic: 0.7, surface: 0.8, workers: 0.75 }, ["W-21", 12, 18, 1.2, 13]),
      z("kalupur", "Kalupur (old city)", 23.03, 72.6, 1.2, 110000, { treeCover: 0.05, builtUp: 0.95, traffic: 0.75, surface: 0.9, workers: 0.9 }, ["W-11", 9, 25, 0.8, 15]),
      z("naroda", "Naroda industrial", 23.07, 72.66, 1.6, 72000, { treeCover: 0.06, builtUp: 0.8, traffic: 0.6, surface: 0.92, workers: 0.7 }, ["W-31", 8, 30, 2.4, 16]),
      z("vatva", "Vatva GIDC", 22.96, 72.63, 1.6, 64000, { treeCover: 0.05, builtUp: 0.78, traffic: 0.55, surface: 0.9, workers: 0.65 }, ["W-44", 8, 35, 2.8, 16]),
      z("navrangpura", "Navrangpura", 23.04, 72.56, 1.2, 58000, { treeCover: 0.2, builtUp: 0.8, traffic: 0.85, surface: 0.75, workers: 0.6 }, ["W-07", 18, 5, 0.9, 11]),
      z("paldi", "Paldi", 23.01, 72.56, 1.2, 54000, { treeCover: 0.22, builtUp: 0.75, traffic: 0.6, surface: 0.7, workers: 0.5 }, ["W-14", 14, 6, 1, 10]),
      z("vastrapur", "Vastrapur", 23.04, 72.53, 1.3, 62000, { treeCover: 0.35, builtUp: 0.6, traffic: 0.5, surface: 0.55, workers: 0.4 }, ["W-03", 20, 4, 1.1, 7]),
      z("satellite", "Satellite", 23.02, 72.51, 1.3, 70000, { treeCover: 0.3, builtUp: 0.65, traffic: 0.55, surface: 0.6, workers: 0.35 }, ["W-05", 24, 3, 1.3, 8]),
      z("bopal", "Bopal", 23.03, 72.47, 1.5, 48000, { treeCover: 0.25, builtUp: 0.55, traffic: 0.4, surface: 0.55, workers: 0.3 }, ["W-48", 22, 6, 2, 7]),
      z("sabarmati", "Sabarmati", 23.07, 72.58, 1.3, 66000, { treeCover: 0.18, builtUp: 0.7, traffic: 0.5, surface: 0.65, workers: 0.45 }, ["W-17", 11, 15, 1.5, 10]),
      z("chandkheda", "Chandkheda", 23.11, 72.59, 1.5, 52000, { treeCover: 0.2, builtUp: 0.6, traffic: 0.4, surface: 0.6, workers: 0.35 }, ["W-01", 15, 10, 1.8, 8]),
      z("odhav", "Odhav", 23.03, 72.67, 1.4, 58000, { treeCover: 0.07, builtUp: 0.8, traffic: 0.5, surface: 0.85, workers: 0.6 }, ["W-36", 8, 28, 2.2, 14]),
    ],
    coolingPoints: [
      cp("kalupur-water", "Kalupur station water kiosk", "water", 23.026, 72.601),
      cp("manekchowk-ors", "Manek Chowk ORS point", "ors", 23.023, 72.588),
      cp("laldarwaja-shade", "Lal Darwaja shaded rest stop", "shade", 23.027, 72.58),
      cp("maninagar-centre", "Maninagar cooling centre", "centre", 23.0, 72.605),
      cp("naroda-water", "Naroda water tanker point", "water", 23.07, 72.655),
      cp("riverfront-shade", "Sabarmati riverfront shade", "shade", 23.045, 72.57),
      cp("vatva-ors", "Vatva GIDC ORS point", "ors", 22.962, 72.625),
    ],
    whyHere:
      "Ahmedabad launched India's first Heat Action Plan in 2013 after the 2010 heatwave; it remains the national reference for city-level heat response.",
  },
  {
    id: "delhi",
    name: "Delhi",
    state: "NCT",
    center: { lat: 28.62, lng: 77.2 },
    zoom: 11,
    imd: {
      date: "29 May",
      tmaxC: 45,
      tminC: 30,
      humidityPct: 22,
      windKmh: 10,
      level: "Severe heatwave",
      colourCode: "Red",
    },
    zones: [
      z("cp", "Connaught Place", 28.63, 77.22, 1.2, 40000, { treeCover: 0.15, builtUp: 0.9, traffic: 0.9, surface: 0.85, workers: 0.9 }, ["Ward 148", 25, 5, 0.8, 13]),
      z("chandni", "Chandni Chowk", 28.66, 77.23, 1.1, 120000, { treeCover: 0.04, builtUp: 0.97, traffic: 0.8, surface: 0.92, workers: 0.95 }, ["Ward 74", 10, 30, 0.6, 15]),
      z("karolbagh", "Karol Bagh", 28.65, 77.19, 1.2, 95000, { treeCover: 0.08, builtUp: 0.9, traffic: 0.8, surface: 0.85, workers: 0.8 }, ["Ward 91", 12, 20, 0.9, 14]),
      z("anandvihar", "Anand Vihar", 28.65, 77.32, 1.4, 85000, { treeCover: 0.06, builtUp: 0.85, traffic: 0.95, surface: 0.9, workers: 0.7 }, ["Ward 218", 10, 35, 1.6, 16]),
      z("okhla", "Okhla industrial", 28.53, 77.27, 1.5, 70000, { treeCover: 0.07, builtUp: 0.8, traffic: 0.6, surface: 0.92, workers: 0.65 }, ["Ward 176", 9, 40, 2.1, 17]),
      z("nehruplace", "Nehru Place", 28.55, 77.25, 1.1, 45000, { treeCover: 0.1, builtUp: 0.85, traffic: 0.8, surface: 0.9, workers: 0.7 }, ["Ward 172", 30, 8, 1.2, 14]),
      z("lajpat", "Lajpat Nagar", 28.57, 77.24, 1.2, 90000, { treeCover: 0.12, builtUp: 0.85, traffic: 0.7, surface: 0.8, workers: 0.75 }, ["Ward 160", 12, 15, 0.7, 13]),
      z("mayurvihar", "Mayur Vihar", 28.61, 77.3, 1.4, 110000, { treeCover: 0.15, builtUp: 0.75, traffic: 0.6, surface: 0.7, workers: 0.5 }, ["Ward 221", 15, 20, 1.5, 11]),
      z("rohini", "Rohini", 28.72, 77.11, 1.6, 130000, { treeCover: 0.18, builtUp: 0.7, traffic: 0.55, surface: 0.7, workers: 0.45 }, ["Ward 54", 14, 12, 1.8, 11]),
      z("dwarka", "Dwarka", 28.59, 77.05, 1.6, 120000, { treeCover: 0.22, builtUp: 0.6, traffic: 0.5, surface: 0.6, workers: 0.35 }, ["Ward 133", 24, 6, 2.2, 9]),
      z("saket", "Saket", 28.52, 77.21, 1.2, 60000, { treeCover: 0.28, builtUp: 0.65, traffic: 0.6, surface: 0.6, workers: 0.4 }, ["Ward 168", 20, 10, 1, 9]),
      z("ridge", "Central Ridge / Lutyens", 28.61, 77.18, 1.4, 25000, { treeCover: 0.6, builtUp: 0.25, traffic: 0.35, surface: 0.3, workers: 0.25 }, ["NDMC", 6, 2, 2.5, 3]),
    ],
    coolingPoints: [
      cp("chandni-water", "Chandni Chowk water kiosk", "water", 28.656, 77.232),
      cp("cp-shade", "Palika Bazar shaded rest stop", "shade", 28.632, 77.218),
      cp("karolbagh-ors", "Karol Bagh ORS point", "ors", 28.651, 77.19),
      cp("anandvihar-centre", "Anand Vihar ISBT cooling centre", "centre", 28.647, 77.316),
      cp("nehruplace-water", "Nehru Place water kiosk", "water", 28.549, 77.251),
      cp("okhla-shade", "Okhla Phase II shaded rest stop", "shade", 28.532, 77.272),
      cp("lajpat-ors", "Lajpat Nagar ORS point", "ors", 28.568, 77.243),
    ],
    whyHere:
      "Delhi recorded its highest-ever temperatures in the May 2024 heatwave; its outdoor workforce is among the largest in the country.",
  },
];

export const defaultCity = cities[0];

/** Hexagon area, km². */
export const zoneAreaKm2 = (zone: Zone) => 2.598 * zone.radiusKm * zone.radiusKm;

/** Derived static fields: population density and relief-facility counts. */
export function zoneDerived(city: City, zone: Zone) {
  const within = city.coolingPoints.filter(
    (p) => distanceKm(p, zone.center) <= zone.radiusKm + 0.3
  );
  return {
    populationDensityPerKm2: Math.round(zone.population / zoneAreaKm2(zone)),
    coolingShelterCount: within.filter((p) => p.kind === "centre" || p.kind === "shade").length,
    waterPointCount: within.filter((p) => p.kind === "water" || p.kind === "ors").length,
  };
}

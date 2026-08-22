// Snapshot data — IMD-style bulletin values and representative urban factors.
// Everything is hardcoded: the demo never depends on a live feed.
// Zones are representative hexagonal cells placed on real neighbourhoods,
// not official ward boundaries (stated on screen).

import type { LatLng } from "@/lib/geo";

export type ZoneFactors = {
  treeCover: number; // 0..1 canopy fraction
  builtUp: number; // 0..1 built-up density
  traffic: number; // 0..1 traffic density
  surface: number; // 0..1 impervious concrete/asphalt share
  workers: number; // 0..1 outdoor-worker density (vendors, police, delivery)
};

export type Zone = {
  id: string;
  name: string;
  center: LatLng;
  radiusKm: number;
  population: number;
  factors: ZoneFactors;
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
  f: ZoneFactors
): Zone => ({ id, name, center: { lat, lng }, radiusKm, population, factors: f });

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
      z("maninagar", "Maninagar", 23.0, 72.6, 1.4, 96000, { treeCover: 0.08, builtUp: 0.85, traffic: 0.7, surface: 0.8, workers: 0.75 }),
      z("kalupur", "Kalupur (old city)", 23.03, 72.6, 1.2, 110000, { treeCover: 0.05, builtUp: 0.95, traffic: 0.75, surface: 0.9, workers: 0.9 }),
      z("naroda", "Naroda industrial", 23.07, 72.66, 1.6, 72000, { treeCover: 0.06, builtUp: 0.8, traffic: 0.6, surface: 0.92, workers: 0.7 }),
      z("vatva", "Vatva GIDC", 22.96, 72.63, 1.6, 64000, { treeCover: 0.05, builtUp: 0.78, traffic: 0.55, surface: 0.9, workers: 0.65 }),
      z("navrangpura", "Navrangpura", 23.04, 72.56, 1.2, 58000, { treeCover: 0.2, builtUp: 0.8, traffic: 0.85, surface: 0.75, workers: 0.6 }),
      z("paldi", "Paldi", 23.01, 72.56, 1.2, 54000, { treeCover: 0.22, builtUp: 0.75, traffic: 0.6, surface: 0.7, workers: 0.5 }),
      z("vastrapur", "Vastrapur", 23.04, 72.53, 1.3, 62000, { treeCover: 0.35, builtUp: 0.6, traffic: 0.5, surface: 0.55, workers: 0.4 }),
      z("satellite", "Satellite", 23.02, 72.51, 1.3, 70000, { treeCover: 0.3, builtUp: 0.65, traffic: 0.55, surface: 0.6, workers: 0.35 }),
      z("bopal", "Bopal", 23.03, 72.47, 1.5, 48000, { treeCover: 0.25, builtUp: 0.55, traffic: 0.4, surface: 0.55, workers: 0.3 }),
      z("sabarmati", "Sabarmati", 23.07, 72.58, 1.3, 66000, { treeCover: 0.18, builtUp: 0.7, traffic: 0.5, surface: 0.65, workers: 0.45 }),
      z("chandkheda", "Chandkheda", 23.11, 72.59, 1.5, 52000, { treeCover: 0.2, builtUp: 0.6, traffic: 0.4, surface: 0.6, workers: 0.35 }),
      z("odhav", "Odhav", 23.03, 72.67, 1.4, 58000, { treeCover: 0.07, builtUp: 0.8, traffic: 0.5, surface: 0.85, workers: 0.6 }),
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
      z("cp", "Connaught Place", 28.63, 77.22, 1.2, 40000, { treeCover: 0.15, builtUp: 0.9, traffic: 0.9, surface: 0.85, workers: 0.9 }),
      z("chandni", "Chandni Chowk", 28.66, 77.23, 1.1, 120000, { treeCover: 0.04, builtUp: 0.97, traffic: 0.8, surface: 0.92, workers: 0.95 }),
      z("karolbagh", "Karol Bagh", 28.65, 77.19, 1.2, 95000, { treeCover: 0.08, builtUp: 0.9, traffic: 0.8, surface: 0.85, workers: 0.8 }),
      z("anandvihar", "Anand Vihar", 28.65, 77.32, 1.4, 85000, { treeCover: 0.06, builtUp: 0.85, traffic: 0.95, surface: 0.9, workers: 0.7 }),
      z("okhla", "Okhla industrial", 28.53, 77.27, 1.5, 70000, { treeCover: 0.07, builtUp: 0.8, traffic: 0.6, surface: 0.92, workers: 0.65 }),
      z("nehruplace", "Nehru Place", 28.55, 77.25, 1.1, 45000, { treeCover: 0.1, builtUp: 0.85, traffic: 0.8, surface: 0.9, workers: 0.7 }),
      z("lajpat", "Lajpat Nagar", 28.57, 77.24, 1.2, 90000, { treeCover: 0.12, builtUp: 0.85, traffic: 0.7, surface: 0.8, workers: 0.75 }),
      z("mayurvihar", "Mayur Vihar", 28.61, 77.3, 1.4, 110000, { treeCover: 0.15, builtUp: 0.75, traffic: 0.6, surface: 0.7, workers: 0.5 }),
      z("rohini", "Rohini", 28.72, 77.11, 1.6, 130000, { treeCover: 0.18, builtUp: 0.7, traffic: 0.55, surface: 0.7, workers: 0.45 }),
      z("dwarka", "Dwarka", 28.59, 77.05, 1.6, 120000, { treeCover: 0.22, builtUp: 0.6, traffic: 0.5, surface: 0.6, workers: 0.35 }),
      z("saket", "Saket", 28.52, 77.21, 1.2, 60000, { treeCover: 0.28, builtUp: 0.65, traffic: 0.6, surface: 0.6, workers: 0.4 }),
      z("ridge", "Central Ridge / Lutyens", 28.61, 77.18, 1.4, 25000, { treeCover: 0.6, builtUp: 0.25, traffic: 0.35, surface: 0.3, workers: 0.25 }),
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

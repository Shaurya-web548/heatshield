# 🌡️ HeatShield — Urban Heat Resilience

Heat-risk identification and response for Indian cities: a localized
Heat-Risk Index that combines IMD bulletin data with ward-level urban
factors, a hotspot dashboard, threshold-based alerts for authorities, and a
municipal response console that tracks relief measures for accountability.

**Nothing on screen depends on a live network** except map tiles and one
optional AI call with a silent fallback. All IMD values and urban factors are
a hardcoded snapshot (stated on screen: *"Simplified heat-index model · IMD
snapshot data · representative zones"*).

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## The demo (one take)

1. Pick **Ahmedabad** or **Delhi**. The map shows 12 representative zones on
   real neighbourhoods.
2. Press **▶ PLAY DAY** → the clock runs 06:00 → 20:00 in ~10 s. Zones turn
   yellow → orange → red as the afternoon heats; the old city and industrial
   belts go CRITICAL around 13:00–15:00 while tree-rich zones stay cooler.
3. **Threshold alerts** fire automatically into the 🔔 log with ACK buttons;
   banners announce escalations.
4. Click a zone → **"Why is Kalupur CRITICAL?"** — the factor breakdown
   (IMD temp, humidity, built-up, concrete, traffic, tree cover → localized
   feels-like, worker exposure).
5. Click anywhere on the map → the **heat risk at that exact spot** with
   worker guidance and the nearest cooling point.
6. **📢 Worker advisory** re-issues every hour in English / हिन्दी.
7. **⚗️ What-if**: shift IMD temperature/humidity, or green a ward and watch
   its HRI fall.
8. **🛡️ Authority** → sign in → the **Response console**: dispatch water
   tankers / shade tents / ORS kiosks / cooling centres, advance tickets
   OPEN → DISPATCHED → ON SITE → RESOLVED, see the alert→dispatch KPI and the
   accountability log, export the audit trail as CSV.

## Authority access

The response console is behind a sign-in: any officer ID plus access code
**`HEAT-1070`** (demo-grade, client-side — a real deployment would use
municipal SSO/OTP). Sign-out is in the title chip; the session remembers a
successful sign-in. Tickets persist per city in the browser's localStorage.

## System architecture (four layers)

| Layer | Where | Snapshot build | Production swap |
|---|---|---|---|
| 1 · Data ingestion | `lib/ingest.ts` — one adapter per source (`ImdSource`, `SatelliteSource`, `GisSource`, `TrafficSource`) | bundled snapshot in `data/cities.ts` | IMD bulletin/API (hourly), Landsat/Sentinel LST + NDVI (daily), municipal GIS + Census (static), traffic API (live) |
| 2 · Risk engine | `lib/heat.ts` | normalizes inputs, weighted composite per zone, threshold flags | unchanged |
| 3 · Storage | `lib/history.ts` (hourly readings time-series), `lib/response.ts` (tickets) | browser localStorage + CSV export | any DB with a zone table and a readings table |
| 4 · Presentation & action | map + ranking + zone table, alerts, advisories, response console | in-dashboard banners, simulated SMS | SMS / app push to role-based contacts |

Flow: IMD + satellite + GIS → risk engine → storage → dashboard / alerts → authority action → logged back to storage.

## Data schema (per zone, see 📋 Table tab and its CSV)

- **Static** (monthly/yearly): `zone_id`, `zone_name`, `ward_number`, `tree_cover_pct` (NDVI), `built_up_pct`, `avg_building_height_m`, `population`, `population_density_km2`, `outdoor_worker_density`, `informal_settlement_pct`, `nearest_health_centre_km`, `cooling_shelter_count`, `water_point_count`
- **Dynamic** (hourly/daily): `air_temp_c` (IMD), `feels_like_c` (humidity-adjusted), `land_surface_temp_c` (satellite), `traffic_index`, wind, time of day
- **Derived**: `hri` (0–100), `risk_level` (Low / Moderate / High / Critical), `last_updated`
- **Event/response** (response-log CSV): alert sent + recipients + timestamp, measure taken, officer, each status timestamp, outcome notes, risk level at resolution

## Risk scoring — weighted composite

```
HRI = 0.30 × heat index (IMD temp + humidity; 30 °C → 0 … 50 °C → 100)
    + 0.20 × land-surface temperature (30 °C → 0 … 60 °C → 100)
    + 0.20 × (100 − tree cover %)
    + 0.15 × built-up density %
    + 0.15 × traffic density index
  [ + 0.00 × outdoor-worker exposure — optional weight ]
```

Every factor is normalized to 0–100 before weighting; weights are **configurable
from the ⚗️ What-if panel** (expert / municipal input) and normalized by their
sum. Bands: Low 0–40 · Moderate 41–60 · High 61–80 · Critical 81–100. The
explainability card shows each factor's reading, normalized value, weight and
points. Weights can be tuned later against ward-level heatstroke case data.

Supporting curves: air temperature follows a diurnal curve between the
bulletin's Tmin and Tmax (peak ~15:00); humidity falls as the air heats; LST is
air temperature plus a zone surface offset scaled by solar heating.

## Alerts and response

- **Trigger**: a zone crosses into High or Critical. **De-dup**: one alert per
  zone per level per day. **Routing**: ward officer always; local health centre
  for Critical or zones with ≥25 % informal settlement; traffic control room
  where traffic index ≥0.7. **Escalation**: Critical with no acknowledgement or
  ticket for 2 h → auto-escalated to the Zonal Deputy Commissioner.
- **Response state machine**: Alert triggered → Acknowledged → Action taken
  (ticket OPEN → DISPATCHED → ON SITE) → RESOLVED with outcome notes and the
  zone's risk level at resolution. Every step stamped with officer, simulation
  time and wall clock. **Analytics**: alert→dispatch KPI, per-ward response
  times, zones alerted with no response.

## Live AI (optional)

Copy `.env.example` to `.env.local`, set `GEMINI_API_KEY` (and optionally
`GEMINI_MODEL`), restart. The advisory panel's dot turns green when the
hour's advisory was written live by Gemini from the exact simulation
numbers; on any error or a 4-second timeout the generated advisory is used
silently. The live layer is never used while a what-if is active.

## Hosting

Pushes to `main` deploy a static export to GitHub Pages (`.github/workflows/
deploy.yml`). The static site has no API route, so the live-AI dot stays grey
there — everything else works.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind 4 · react-leaflet 5 /
Leaflet 1.9 (CartoDB dark tiles) · framer-motion. Geometry is ~50 lines in
`lib/geo.ts`; the model is `lib/heat.ts`.

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

## The model (deliberately simple, fully explainable)

- **IMD layer**: air temperature follows a diurnal curve between the
  bulletin's Tmin and Tmax (peak ~15:00); humidity falls as the air heats;
  the Rothfusz heat index gives a city-wide feels-like.
- **Local layer** (per zone, °C): built-up density up to +3.5, concrete /
  asphalt surface up to +2.5, traffic up to +1.5, tree cover down to −3.0,
  all weighted by the solar profile.
- **Exposure**: outdoor-worker density adds up to +12 HRI points.
- **HRI 0–100** maps 33 °C → 0 and 52 °C → 100 feels-like. Thresholds: WATCH
  ≥ 40, ALERT ≥ 60, CRITICAL ≥ 80.
- **Point risk**: the three nearest zones' factors blended by inverse
  distance.

It is a communication and decision-support model, not a meteorological one.

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

# 🌡️ HeatShield — Urban Heat Resilience

*Hackathon project write-up — Heat-Risk Identification & Response*

## Problem

India's heatwaves hit outdoor workers hardest — street vendors, traffic
police, delivery riders. IMD advisories are city-level: one temperature for
the whole of Ahmedabad or Delhi. But a concrete market street with no trees
and heavy traffic can feel 5–6 °C hotter than the airport reading the
bulletin is based on. Civic response today is reactive: a tanker is sent
after a collapse is reported. Nobody sees the hotspot forming.

## Solution

HeatShield is a decision-support system that turns the IMD bulletin into a
**localized Heat-Risk Index** per ward/zone, shows the hotspots forming
through the day, alerts authorities when a zone crosses a threshold, and
tracks every relief measure to a resolved ticket.

| Brief requirement | What HeatShield does |
|---|---|
| Localized Heat-Risk Index combining IMD data with tree cover, traffic, surfaces | Explainable HRI: IMD heat index (temp + humidity) + built-up, concrete surface, traffic, tree cover, outdoor-worker exposure — every factor shown with its °C contribution |
| Hotspot dashboard across wards and zones | Choropleth of 12 representative zones per city that "ignites" through the day; ranked hotspot table; click-anywhere point risk |
| Threshold-based alerts to authorities | Automatic alerts on escalation to ALERT / CRITICAL with banners, SMS note, ACK trail and open-count badge |
| Response tracking and accountability | Municipal response console: dispatch measures, ticket lifecycle OPEN → DISPATCHED → ON SITE → RESOLVED stamped with officer + time, alert→dispatch KPI, accountability log, CSV export |

Plus: bilingual (EN/हिन्दी) worker advisories re-issued hourly, cooling points
on the map, and what-if planning (temperature shift, humidity shift, "green
this ward").

## Two cities

- **Ahmedabad** — India's first Heat Action Plan (2013); snapshot 44/29 °C,
  Orange heatwave.
- **Delhi** — record temperatures in the May 2024 heatwave; snapshot
  45/30 °C, Red severe heatwave.

Zones are hexagonal cells placed on real neighbourhoods (Kalupur, Maninagar,
Naroda, Vastrapur… / Chandni Chowk, Connaught Place, Okhla, Central Ridge…)
with representative urban factors — stated on screen as representative, not
official ward boundaries.

## Demo script (~90 seconds)

1. Ahmedabad, 06:00, all green. Press PLAY DAY.
2. By 11:00 the old city turns yellow; at 13:00 Kalupur bursts red —
   "🔥 Kalupur (old city) is now CRITICAL — ward officer notified".
3. Click Kalupur: "Why is Kalupur CRITICAL? 44 °C IMD + 3.3 built-up + 2.3
   concrete + 1.1 traffic − 0.2 trees = 50 °C feels-like." Then click Bopal
   (tree cover 25 %) — two zones, same IMD number, 20 HRI points apart.
4. Click a street: point risk 84 CRITICAL, "Stop outdoor work… nearest
   relief: Manek Chowk ORS point, 2.3 km".
5. Toggle हिन्दी on the worker advisory.
6. 🛡️ Authority → sign in → dispatch a water tanker to Kalupur → advance to
   ON SITE → show the alert→dispatch KPI and export the CSV.
7. ⚗️ What-if: green Kalupur +40 % → HRI 80 → 73. "This is what a tree
   budget buys."

## Honest limitations

- The heat model is a simplified, explainable index, not a meteorological
  or CFD model; factors are representative values, not surveyed data.
- IMD values are a snapshot, not a live feed; alerts and dispatches are
  simulated — no messages or vehicles are real.
- Authority sign-in is demo-grade.

## Stack

Next.js 15 · TypeScript · Tailwind 4 · react-leaflet 5 · framer-motion ·
optional Gemini. Runs fully offline except map tiles.

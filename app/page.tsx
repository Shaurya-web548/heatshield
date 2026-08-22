"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cities, defaultCity } from "@/data/cities";

// Leaflet touches `window` at module scope — it must never run during SSR.
const HeatMap = dynamic(() => import("@/components/HeatMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0b0a0f] text-neutral-500">
      Loading map…
    </div>
  ),
});

export default function Home() {
  const [city, setCity] = useState(defaultCity);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0b0a0f]">
      {/* key remounts the map per city for a clean reset */}
      <HeatMap key={city.id} city={city} />

      <div className="vignette z-[900]" />
      <div className="film-grain z-[901]" />

      <div className="absolute left-3 top-3 z-[1000] sm:left-5 sm:top-5">
        <div className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 shadow-xl backdrop-blur-md sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="text-base font-semibold tracking-wide sm:text-lg">
              🌡️ HeatShield
            </span>
            <select
              value={city.id}
              onChange={(e) =>
                setCity(cities.find((c) => c.id === e.target.value) ?? defaultCity)
              }
              aria-label="City"
              className="rounded-md border border-white/15 bg-black/60 px-2 py-1 text-xs text-neutral-200 outline-none hover:border-white/30"
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-0.5 text-xs text-neutral-400">
            Simplified heat-index model · IMD snapshot data
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ControlBar, { type PlayState } from "@/components/ControlBar";
import { TitleChip, BulletinCard } from "@/components/Overlays";
import { cities, defaultCity } from "@/data/cities";
import { cityRisks, DAY_START, type ZoneRisk } from "@/lib/heat";

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
  const [hour, setHour] = useState(DAY_START);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [selected, setSelected] = useState<ZoneRisk | null>(null);

  const risks = useMemo(() => cityRisks(city, hour), [city, hour]);

  const handleCityChange = useCallback((id: string) => {
    const next = cities.find((c) => c.id === id);
    if (!next) return;
    setCity(next);
    setHour(DAY_START);
    setPlayState("idle");
    setSelected(null);
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0b0a0f]">
      {/* key remounts the map per city for a clean reset */}
      <HeatMap
        key={city.id}
        city={city}
        hour={hour}
        selectedZoneId={selected?.zone.id ?? null}
        onZoneClick={setSelected}
      />

      <div className="vignette z-[900]" />
      <div className="film-grain z-[901]" />

      <TitleChip city={city} onCityChange={handleCityChange} />

      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-3 sm:right-5 sm:top-5">
        <BulletinCard city={city} hour={hour} risks={risks} />
      </div>

      <ControlBar
        hour={hour}
        playState={playState}
        onScrub={(h) => {
          setHour(h);
          setPlayState("idle");
        }}
        onPlay={() => setPlayState((s) => (s === "playing" ? "idle" : "playing"))}
      />
    </main>
  );
}

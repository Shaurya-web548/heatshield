"use client";

import { motion } from "framer-motion";
import { cities, type City } from "@/data/cities";
import {
  airTempC,
  humidityPct,
  LEVEL_COLORS,
  type ZoneRisk,
} from "@/lib/heat";

const CODE_STYLES: Record<string, string> = {
  Green: "bg-green-500/20 text-green-300 border-green-400/40",
  Yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40",
  Orange: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  Red: "bg-red-500/25 text-red-300 border-red-400/50",
};

export function TitleChip({
  city,
  onCityChange,
  isAuthority,
  onAuthority,
}: {
  city: City;
  onCityChange: (id: string) => void;
  isAuthority: boolean;
  onAuthority: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
      className="absolute left-3 top-3 z-[1000] sm:left-5 sm:top-5"
    >
      <div className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 shadow-xl backdrop-blur-md sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="text-base font-semibold tracking-wide sm:text-lg">
            🌡️ HeatShield
          </span>
          <select
            value={city.id}
            onChange={(e) => onCityChange(e.target.value)}
            aria-label="City"
            className="rounded-md border border-white/15 bg-black/60 px-2 py-1 text-xs text-neutral-200 outline-none hover:border-white/30"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={onAuthority}
            title={isAuthority ? "Sign out of the response console" : "Municipal officer sign-in"}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              isAuthority
                ? "border-amber-400/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                : "border-white/15 text-neutral-300 hover:bg-white/10"
            }`}
          >
            🛡️ {isAuthority ? "Sign out" : "Authority"}
          </button>
        </div>
        <div className="mt-0.5 text-xs text-neutral-400">
          Simplified heat-index model · IMD snapshot data · representative zones
        </div>
      </div>
    </motion.div>
  );
}

export function BulletinCard({
  city,
  hour,
  risks,
}: {
  city: City;
  hour: number;
  risks: ZoneRisk[];
}) {
  const counts = {
    CRITICAL: risks.filter((r) => r.level === "CRITICAL").length,
    ALERT: risks.filter((r) => r.level === "ALERT").length,
    WATCH: risks.filter((r) => r.level === "WATCH").length,
    NORMAL: risks.filter((r) => r.level === "NORMAL").length,
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className="w-64 rounded-xl border border-white/10 bg-black/70 px-4 py-3 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          IMD bulletin · {city.imd.date}
        </span>
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${CODE_STYLES[city.imd.colourCode]}`}
        >
          {city.imd.colourCode.toUpperCase()}
        </span>
      </div>
      <div className="mt-1 text-sm font-semibold text-neutral-100">
        {city.imd.level} · {city.name}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-xs tabular-nums">
        <span className="text-neutral-400">Tmax / Tmin</span>
        <span className="text-right text-orange-300">
          {city.imd.tmaxC} / {city.imd.tminC} °C
        </span>
        <span className="text-neutral-400">Now (air)</span>
        <span className="text-right text-orange-200">
          {airTempC(city, hour).toFixed(1)} °C
        </span>
        <span className="text-neutral-400">Humidity</span>
        <span className="text-right text-sky-200">
          {humidityPct(city, hour).toFixed(0)}%
        </span>
        <span className="text-neutral-400">Wind</span>
        <span className="text-right text-sky-200">{city.imd.windKmh} km/h</span>
      </div>
      <div className="mt-2 flex gap-1.5 border-t border-white/10 pt-2 text-[11px] font-semibold">
        {(["CRITICAL", "ALERT", "WATCH", "NORMAL"] as const).map((l) => (
          <span
            key={l}
            className="flex-1 rounded-md py-0.5 text-center"
            style={{
              background: `${LEVEL_COLORS[l]}22`,
              color: LEVEL_COLORS[l],
            }}
            title={l}
          >
            {counts[l]}
          </span>
        ))}
      </div>
      <div className="mt-0.5 flex gap-1.5 text-[9px] uppercase tracking-wider text-neutral-500">
        <span className="flex-1 text-center">crit</span>
        <span className="flex-1 text-center">alert</span>
        <span className="flex-1 text-center">watch</span>
        <span className="flex-1 text-center">ok</span>
      </div>
    </motion.div>
  );
}

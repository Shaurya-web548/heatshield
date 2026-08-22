"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { City } from "@/data/cities";
import {
  zoneRisk,
  isWhatIfActive,
  areWeightsCustom,
  DEFAULT_PARAMS,
  DEFAULT_WEIGHTS,
  FACTOR_LABELS,
  LEVEL_COLORS,
  type FactorKey,
  type SimParams,
} from "@/lib/heat";

export function WhatIfPanel({
  open,
  city,
  hour,
  params,
  greenZoneId,
  onChange,
  onGreenZone,
  onReset,
  onClose,
}: {
  open: boolean;
  city: City;
  hour: number;
  params: SimParams;
  greenZoneId: string;
  onChange: (p: SimParams) => void;
  onGreenZone: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const active = isWhatIfActive(params);
  const customWeights = areWeightsCustom(params);
  const zone = city.zones.find((z) => z.id === greenZoneId) ?? city.zones[0];
  const greening = params.greening[zone.id] ?? 0;
  const baseline = zoneRisk(city, zone, hour, { ...DEFAULT_PARAMS, weights: params.weights });
  const whatIf = zoneRisk(city, zone, hour, params);
  const wSum = (Object.keys(params.weights) as FactorKey[]).reduce(
    (s, k) => s + params.weights[k],
    0
  );

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    fmt: (v: number) => string,
    set: (v: number) => void,
    accent = "accent-sky-400"
  ) => (
    <div>
      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        <span className="truncate">{label}</span>
        <span className="font-mono text-sky-200">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className={`mt-0.5 h-1.5 w-full cursor-pointer ${accent}`}
      />
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute bottom-20 left-1/2 z-[1000] max-h-[calc(100vh-8rem)] w-[23rem] max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-y-auto rounded-xl border border-sky-400/25 bg-black/80 px-4 py-3 shadow-2xl backdrop-blur-md sm:bottom-28"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-300">
              ⚗️ What-if planning
            </span>
            <span className="flex items-center gap-1.5">
              {(active || customWeights) && (
                <button
                  onClick={onReset}
                  className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:bg-white/10"
                >
                  Reset all
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close what-if panel"
                className="rounded px-1.5 text-xs text-neutral-500 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </span>
          </div>

          <div className="space-y-2">
            {slider(
              "IMD temperature shift",
              params.tempDeltaC,
              -4,
              6,
              0.5,
              (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} °C`,
              (v) => onChange({ ...params, tempDeltaC: v })
            )}
            {slider(
              "Humidity shift",
              params.humidityDeltaPct,
              -20,
              40,
              1,
              (v) => `${v > 0 ? "+" : ""}${v}%`,
              (v) => onChange({ ...params, humidityDeltaPct: v })
            )}

            <div className="rounded-lg border border-green-400/20 bg-green-500/5 p-2">
              <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-widest text-green-300">
                <span>🌳 Green a ward</span>
                <select
                  value={zone.id}
                  onChange={(e) => onGreenZone(e.target.value)}
                  className="max-w-[9rem] rounded-md border border-white/15 bg-black/60 px-1.5 py-0.5 text-[11px] normal-case tracking-normal text-neutral-200 outline-none"
                >
                  {city.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              {slider(
                "Added tree cover",
                Math.round(greening * 100),
                0,
                40,
                5,
                (v) => `+${v}%`,
                (v) =>
                  onChange({
                    ...params,
                    greening: { ...params.greening, [zone.id]: v / 100 },
                  }),
                "accent-green-400"
              )}
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">{zone.name} HRI</span>
                <span className="font-mono">
                  <span style={{ color: LEVEL_COLORS[baseline.level] }}>{baseline.hri}</span>
                  <span className="text-neutral-500"> → </span>
                  <span style={{ color: LEVEL_COLORS[whatIf.level] }}>{whatIf.hri}</span>
                  <span className="ml-1 text-neutral-500">
                    (LST {whatIf.lstC.toFixed(0)} °C)
                  </span>
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-2">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-amber-300">
                <span>⚖️ Risk weights</span>
                <span className="font-mono normal-case tracking-normal text-neutral-400">
                  Σ {wSum.toFixed(2)}
                  {customWeights && (
                    <button
                      onClick={() => onChange({ ...params, weights: DEFAULT_WEIGHTS })}
                      className="ml-1.5 rounded border border-white/15 px-1 text-[10px] text-neutral-300 hover:bg-white/10"
                    >
                      defaults
                    </button>
                  )}
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {(Object.keys(DEFAULT_WEIGHTS) as FactorKey[]).map((k) =>
                  slider(
                    FACTOR_LABELS[k].replace(/ \(.*\)$/, ""),
                    params.weights[k],
                    0,
                    0.5,
                    0.05,
                    (v) => v.toFixed(2),
                    (v) =>
                      onChange({ ...params, weights: { ...params.weights, [k]: v } }),
                    "accent-amber-400"
                  )
                )}
              </div>
              <div className="mt-1 text-[10px] leading-snug text-neutral-500">
                Default 0.30 / 0.20 / 0.20 / 0.15 / 0.15 — adjustable on expert or
                municipal input; weights are normalized by their sum.
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-between text-[10px] text-neutral-500">
            <span>Changes apply to the map, ranking, alerts and advisory.</span>
            {active && <span className="text-sky-300">what-if active</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

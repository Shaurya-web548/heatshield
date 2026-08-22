"use client";

import { motion } from "framer-motion";
import {
  LEVEL_COLORS,
  THRESHOLDS,
  formatHour,
  type ZoneRisk,
} from "@/lib/heat";

const LEVEL_STYLES: Record<string, string> = {
  NORMAL: "bg-green-500/20 text-green-300 border-green-400/40",
  WATCH: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40",
  ALERT: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  CRITICAL: "bg-red-500/25 text-red-300 border-red-400/50",
};

export function LevelBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${LEVEL_STYLES[level]}`}
    >
      {level}
    </span>
  );
}

/** Ranked ward/zone table — the "Hotspot Dashboard" of the brief. */
export function HotspotTable({
  risks,
  hour,
  selectedId,
  onSelect,
}: {
  risks: ZoneRisk[];
  hour: number;
  selectedId: string | null;
  onSelect: (r: ZoneRisk) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        <span>🔥 Hotspot ranking · {formatHour(hour)}</span>
        <span className="normal-case tracking-normal text-neutral-500">
          HRI 0–100
        </span>
      </div>
      <div className="max-h-[38vh] space-y-1 overflow-y-auto pr-0.5">
        {risks.map((r, i) => {
          const active = r.zone.id === selectedId;
          return (
            <button
              key={r.zone.id}
              onClick={() => onSelect(r)}
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                active
                  ? "border-white/40 bg-white/15"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className="w-4 shrink-0 font-mono text-[10px] text-neutral-500">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-neutral-100">
                  {r.zone.name}
                </span>
                <span className="mt-0.5 block h-1 w-full overflow-hidden rounded bg-white/10">
                  <span
                    className="block h-full rounded transition-[width] duration-300"
                    style={{
                      width: `${r.hri}%`,
                      background: LEVEL_COLORS[r.level],
                    }}
                  />
                </span>
              </span>
              <span
                className="w-8 shrink-0 text-right font-mono text-sm font-bold tabular-nums"
                style={{ color: LEVEL_COLORS[r.level] }}
              >
                {r.hri}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "Why is this zone HIGH?" — the explainable factor breakdown. */
export function ExplainCard({
  risk,
  onClose,
}: {
  risk: ZoneRisk;
  onClose: () => void;
}) {
  const exposure = Math.round(12 * risk.zone.factors.workers);
  return (
    <motion.div
      key={risk.zone.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 rounded-lg border border-white/15 bg-white/5 p-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Why is {risk.zone.name} {risk.level}?
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className="font-mono text-2xl font-bold tabular-nums"
              style={{ color: LEVEL_COLORS[risk.level] }}
            >
              {risk.hri}
            </span>
            <LevelBadge level={risk.level} />
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close explanation"
          className="rounded px-1.5 text-xs text-neutral-500 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mt-1.5 space-y-0.5 text-[11px]">
        {risk.factors.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-2">
            <span className="text-neutral-400">
              {f.label}{" "}
              <span className="text-neutral-600">{f.value}</span>
            </span>
            <span
              className={`font-mono tabular-nums ${
                f.delta > 0.05
                  ? "text-orange-300"
                  : f.delta < -0.05
                    ? "text-green-300"
                    : "text-neutral-500"
              }`}
            >
              {f.delta === 0
                ? "base"
                : `${f.delta > 0 ? "+" : ""}${f.delta.toFixed(1)} °C`}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-1">
          <span className="text-neutral-300">Localized feels-like</span>
          <span className="font-mono font-semibold text-orange-200">
            {risk.feelsLikeC.toFixed(1)} °C
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-neutral-400">
            Outdoor-worker exposure{" "}
            <span className="text-neutral-600">
              {Math.round(risk.zone.factors.workers * 100)}%
            </span>
          </span>
          <span className="font-mono text-orange-300">+{exposure} pts</span>
        </div>
      </div>

      <div className="mt-1.5 text-[10px] leading-snug text-neutral-500">
        Thresholds: WATCH ≥{THRESHOLDS.WATCH} · ALERT ≥{THRESHOLDS.ALERT} ·
        CRITICAL ≥{THRESHOLDS.CRITICAL}.{" "}
        {risk.zone.population > 0 &&
          `Population ${risk.zone.population.toLocaleString("en-IN")}.`}
      </div>
    </motion.div>
  );
}

/** Click-anywhere point risk for a worker's exact spot. */
export function PointRiskCard({
  risk,
  cooling,
  onClose,
}: {
  risk: ZoneRisk & { nearest: { name: string }; distanceKm: number };
  cooling: { name: string; label: string; icon: string; distanceKm: number };
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-20 left-3 z-[1000] w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-black/75 p-3.5 shadow-xl backdrop-blur-md sm:bottom-5 sm:left-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          📍 Heat risk at this spot
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded px-1.5 text-xs text-neutral-500 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <span
          className="font-mono text-3xl font-bold tabular-nums"
          style={{ color: LEVEL_COLORS[risk.level] }}
        >
          {risk.hri}
          <span className="text-sm text-neutral-500">/100</span>
        </span>
        <LevelBadge level={risk.level} />
      </div>
      <div className="mt-1 text-[11px] text-neutral-400">
        Feels like{" "}
        <span className="font-mono text-orange-200">
          {risk.feelsLikeC.toFixed(0)} °C
        </span>{" "}
        · {risk.distanceKm.toFixed(1)} km from {risk.nearest.name} centre
      </div>
      <div className="mt-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200">
        {risk.level === "CRITICAL"
          ? "Stop outdoor work. Move to shade or a cooling point now; drink water every 20 minutes."
          : risk.level === "ALERT"
            ? "Limit outdoor work to essential tasks; take shade breaks every 30 minutes."
            : risk.level === "WATCH"
              ? "Carry water, use head cover; plan heavy work before noon."
              : "Conditions are manageable. Stay hydrated."}
      </div>
      <div className="mt-1.5 text-[11px] text-neutral-400">
        Nearest relief:{" "}
        <span className="text-sky-200">
          {cooling.icon} {cooling.name}
        </span>{" "}
        <span className="text-neutral-500">
          · {cooling.label} · {cooling.distanceKm.toFixed(1)} km
        </span>
      </div>
    </motion.div>
  );
}

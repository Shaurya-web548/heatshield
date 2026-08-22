"use client";

import { motion } from "framer-motion";
import { type City, zoneDerived } from "@/data/cities";
import {
  LEVEL_COLORS,
  THRESHOLDS,
  formatHour,
  type ZoneRisk,
} from "@/lib/heat";
import { CountUp, GrowBar, FAST, pressable } from "@/components/Motion";

const LEVEL_STYLES: Record<string, string> = {
  LOW: "bg-green-500/20 text-green-300 border-green-400/40",
  MODERATE: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40",
  HIGH: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  CRITICAL: "bg-red-500/25 text-red-300 border-red-400/50",
};

export function LevelBadge({ level }: { level: string }) {
  return (
    <motion.span
      key={level}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={FAST}
      className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${LEVEL_STYLES[level]}`}
    >
      {level}
    </motion.span>
  );
}

/** Ranked ward/zone table — the "Hotspot Dashboard" of the brief. */
export function HotspotTable({
  risks,
  hour,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  risks: ZoneRisk[];
  hour: number;
  selectedId: string | null;
  hoveredId?: string | null;
  onSelect: (r: ZoneRisk) => void;
  onHover?: (id: string | null) => void;
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
          const hover = r.zone.id === hoveredId;
          return (
            <motion.button
              key={r.zone.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...FAST, delay: i * 0.03 }}
              whileHover={pressable.whileHover}
              whileTap={pressable.whileTap}
              onClick={() => onSelect(r)}
              onMouseEnter={() => onHover?.(r.zone.id)}
              onMouseLeave={() => onHover?.(null)}
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                active
                  ? "border-white/40 bg-white/15"
                  : hover
                    ? "border-white/25 bg-white/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className="w-4 shrink-0 font-mono text-[10px] text-neutral-500">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-neutral-100">
                  {r.zone.name}
                  <span className="ml-1 text-[10px] text-neutral-500">
                    {r.zone.statics.wardNumber}
                  </span>
                </span>
                <GrowBar pct={r.hri} color={LEVEL_COLORS[r.level]} height={4} delay={0.1 + i * 0.03} className="mt-0.5" />
              </span>
              <CountUp
                value={r.hri}
                className="hri-glow w-10 shrink-0 text-right font-mono text-lg font-extrabold tabular-nums"
                style={{ color: LEVEL_COLORS[r.level] }}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export type PointContext = {
  nearestName: string;
  distanceKm: number;
  cooling: { name: string; label: string; icon: string; distanceKm: number };
};

/** Advice for someone standing there right now. */
function workerAdvice(level: string) {
  if (level === "CRITICAL")
    return "Stop outdoor work. Move to shade or a cooling point now; drink water every 20 minutes.";
  if (level === "HIGH")
    return "Limit outdoor work to essential tasks; take shade breaks every 30 minutes.";
  if (level === "MODERATE")
    return "Carry water, use head cover; plan heavy work before noon.";
  return "Conditions are manageable. Stay hydrated.";
}

/**
 * "Why is this zone HIGH?" — weighted-composite breakdown. With `point` set it
 * explains a spot clicked on the map instead of a zone, so one card on the
 * right always answers "what is the HRI of the thing I just clicked?".
 */
export function ExplainCard({
  risk,
  point = null,
  onClose,
}: {
  risk: ZoneRisk;
  point?: PointContext | null;
  onClose: () => void;
}) {
  return (
    <motion.div
      key={`${risk.zone.id}-${risk.hri}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={FAST}
      className="mt-2 rounded-lg border border-white/15 bg-white/5 p-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            {point
              ? "📍 Heat risk at this spot"
              : `Why is ${risk.zone.name} ${risk.level}?`}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <CountUp
              value={risk.hri}
              className="hri-glow font-mono text-5xl font-extrabold leading-none tabular-nums"
              style={{ color: LEVEL_COLORS[risk.level] }}
            />
            <LevelBadge level={risk.level} />
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close explanation"
          className="rounded px-1.5 text-xs text-neutral-500 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {point && (
        <div className="mt-1 text-[11px] text-neutral-400">
          {point.distanceKm.toFixed(1)} km from {point.nearestName} centre ·
          blended from the three nearest zones
        </div>
      )}

      <div className="mt-1.5 grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-0.5 text-[10px]">
        <span className="text-neutral-500">factor · reading</span>
        <span className="text-right text-neutral-500">norm</span>
        <span className="text-right text-neutral-500">w</span>
        <span className="text-right text-neutral-500">pts</span>
        {risk.factors.map((f, i) => (
          <FactorRow key={f.key} index={i} label={f.label} value={f.value} normalized={f.normalized} weight={f.weight} points={f.points} />
        ))}
      </div>

      <div className="mt-1.5 flex items-center justify-between border-t border-white/10 pt-1 text-[11px]">
        <span className="text-neutral-400">Indicative feels-like on the street</span>
        <span className="font-mono text-orange-200">{risk.feelsLikeC.toFixed(1)} °C</span>
      </div>

      {point && (
        <>
          <div className="mt-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200">
            {workerAdvice(risk.level)}
          </div>
          <div className="mt-1.5 text-[11px] text-neutral-400">
            Nearest relief:{" "}
            <span className="text-sky-200">
              {point.cooling.icon} {point.cooling.name}
            </span>{" "}
            <span className="text-neutral-500">
              · {point.cooling.label} · {point.cooling.distanceKm.toFixed(1)} km
            </span>
          </div>
        </>
      )}

      <div className="mt-1.5 text-[10px] leading-snug text-neutral-500">
        Bands: Low 0–{THRESHOLDS.MODERATE - 1} · Moderate {THRESHOLDS.MODERATE}–
        {THRESHOLDS.HIGH - 1} · High {THRESHOLDS.HIGH}–{THRESHOLDS.CRITICAL - 1} ·
        Critical {THRESHOLDS.CRITICAL}+. Full method in the 📐 Heat-Risk Index section.
        {risk.zone.population > 0 &&
          ` Ward ${risk.zone.statics.wardNumber}, population ${risk.zone.population.toLocaleString("en-IN")}.`}
      </div>
    </motion.div>
  );
}

function FactorRow({
  index,
  label,
  value,
  normalized,
  weight,
  points,
}: {
  index: number;
  label: string;
  value: string;
  normalized: number;
  weight: number;
  points: number;
}) {
  const muted = weight === 0;
  const cell = (content: React.ReactNode, cls: string) => (
    <motion.span
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...FAST, delay: 0.05 + index * 0.05 }}
      className={cls}
    >
      {content}
    </motion.span>
  );
  return (
    <>
      {cell(
        <>
          {label.replace(/ \(.*\)$/, "")} <span className="text-neutral-600">{value}</span>
        </>,
        `truncate ${muted ? "text-neutral-600" : "text-neutral-400"}`
      )}
      {cell(normalized, `text-right font-mono ${muted ? "text-neutral-600" : "text-neutral-300"}`)}
      {cell(weight.toFixed(2), `text-right font-mono ${muted ? "text-neutral-600" : "text-sky-300"}`)}
      {cell(points > 0 ? `+${points.toFixed(1)}` : "—", `text-right font-mono ${muted ? "text-neutral-600" : "text-orange-300"}`)}
    </>
  );
}

/** Table view of the full per-zone schema record. */
export function ZoneTable({
  city,
  risks,
  hour,
  onSelect,
  onExport,
}: {
  city: City;
  risks: ZoneRisk[];
  hour: number;
  onSelect: (r: ZoneRisk) => void;
  onExport: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        <span>📋 Zone table · {formatHour(hour)}</span>
        <button
          onClick={onExport}
          className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-neutral-300 transition hover:bg-white/10"
        >
          ⬇ CSV
        </button>
      </div>
      <div className="max-h-[42vh] overflow-auto rounded-lg border border-white/10">
        <table className="w-full border-collapse text-[10px] tabular-nums">
          <thead className="sticky top-0 bg-neutral-900/95 text-left text-neutral-400">
            <tr>
              {["zone", "ward", "HRI", "level", "air °C", "LST °C", "tree%", "built%", "traffic", "workers", "pop/km²", "informal%", "health km", "shelters", "water"].map((h) => (
                <th key={h} className="whitespace-nowrap px-1.5 py-1 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {risks.map((r, i) => {
              const d = zoneDerived(city, r.zone);
              const f = r.zone.factors;
              const s = r.zone.statics;
              return (
                <motion.tr
                  key={r.zone.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  onClick={() => onSelect(r)}
                  className="cursor-pointer border-t border-white/5 text-neutral-300 transition-colors hover:bg-white/10"
                >
                  <td className="whitespace-nowrap px-1.5 py-1 text-neutral-100">{r.zone.name}</td>
                  <td className="px-1.5 py-1 text-neutral-500">{s.wardNumber}</td>
                  <td className="px-1.5 py-1 font-bold" style={{ color: LEVEL_COLORS[r.level] }}>{r.hri}</td>
                  <td className="px-1.5 py-1" style={{ color: LEVEL_COLORS[r.level] }}>{r.level}</td>
                  <td className="px-1.5 py-1">{r.airTempC.toFixed(1)}</td>
                  <td className="px-1.5 py-1">{r.lstC.toFixed(1)}</td>
                  <td className="px-1.5 py-1">{Math.round(f.treeCover * 100)}</td>
                  <td className="px-1.5 py-1">{Math.round(f.builtUp * 100)}</td>
                  <td className="px-1.5 py-1">{Math.round(f.traffic * 100)}</td>
                  <td className="px-1.5 py-1">{Math.round(f.workers * 100)}</td>
                  <td className="px-1.5 py-1">{d.populationDensityPerKm2.toLocaleString("en-IN")}</td>
                  <td className="px-1.5 py-1">{s.informalSettlementPct}</td>
                  <td className="px-1.5 py-1">{s.nearestHealthCentreKm}</td>
                  <td className="px-1.5 py-1">{d.coolingShelterCount}</td>
                  <td className="px-1.5 py-1">{d.waterPointCount}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-1 text-[9px] text-neutral-600">
        Static fields from the GIS/satellite snapshot; dynamic fields recomputed each hour.
      </div>
    </div>
  );
}

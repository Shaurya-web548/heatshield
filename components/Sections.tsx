"use client";

import { motion } from "framer-motion";
import type { City } from "@/data/cities";
import type { HeatAlert } from "@/lib/alerts";
import {
  DEFAULT_WEIGHTS,
  FACTOR_LABELS,
  LEVEL_COLORS,
  THRESHOLDS,
  formatHour,
  type FactorKey,
  type ZoneRisk,
} from "@/lib/heat";
import { MEASURES, STATUS_FLOW, type Ticket } from "@/lib/response";
import { LevelBadge } from "@/components/Dashboard";

export type View = "hotspots" | "hri" | "alerts" | "response";

export const VIEWS: { id: View; label: string; short: string }[] = [
  { id: "hotspots", label: "🔥 Hotspot dashboard", short: "🔥" },
  { id: "hri", label: "📐 Heat-Risk Index", short: "📐" },
  { id: "alerts", label: "🔔 Threshold alerts", short: "🔔" },
  { id: "response", label: "🛡️ Response tracking", short: "🛡️" },
];

export function SectionNav({
  view,
  onView,
  isAuthority,
}: {
  view: View;
  onView: (v: View) => void;
  isAuthority: boolean;
}) {
  return (
    <div className="mb-2.5 flex overflow-hidden rounded-lg border border-white/10 text-[11px]">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onView(v.id)}
          title={v.label}
          className={`flex-1 py-1.5 font-semibold ${
            view === v.id
              ? v.id === "response" && isAuthority
                ? "bg-amber-500/25 text-amber-200"
                : "bg-orange-600/70 text-white"
              : "text-neutral-400 hover:bg-white/10"
          }`}
        >
          <span className="sm:hidden">{v.short}</span>
          <span className="hidden sm:inline">{v.label.replace(/^\S+\s/, "")}</span>
        </button>
      ))}
    </div>
  );
}

const NORMALIZATION: Record<FactorKey, string> = {
  heatIndex: "30 °C → 0 · 50 °C → 100",
  lst: "30 °C → 0 · 60 °C → 100",
  treeDeficit: "100 − tree cover %",
  builtUp: "built-up %",
  traffic: "traffic index × 100",
  workers: "worker density × 100",
};

/** The factor bars shown beneath an HRI. */
export function FactorBars({ risk, compact = false }: { risk: ZoneRisk; compact?: boolean }) {
  const max = Math.max(...risk.factors.map((f) => f.points), 1);
  return (
    <div className={`space-y-0.5 ${compact ? "text-[10px]" : "text-[11px]"}`}>
      {risk.factors
        .filter((f) => f.weight > 0)
        .map((f) => (
          <div key={f.key} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2">
            <span className="truncate text-neutral-400" title={f.label}>
              {f.label.replace(/ \(.*\)$/, "")}
            </span>
            <span className="h-1.5 overflow-hidden rounded bg-white/10">
              <span
                className="block h-full rounded"
                style={{
                  width: `${(f.points / max) * 100}%`,
                  background: LEVEL_COLORS[risk.level],
                  opacity: 0.5 + 0.5 * (f.normalized / 100),
                }}
              />
            </span>
            <span className="font-mono text-neutral-300">
              <span className="text-neutral-500">{f.value} · n{f.normalized} × {f.weight.toFixed(2)} = </span>
              +{f.points.toFixed(1)}
            </span>
          </div>
        ))}
    </div>
  );
}

/** Section: how the HRI is calculated + the city's risk index with factors beneath each score. */
export function HriSection({
  city,
  risks,
  hour,
  onSelect,
}: {
  city: City;
  risks: ZoneRisk[];
  hour: number;
  onSelect: (r: ZoneRisk) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          📐 How the Heat-Risk Index is calculated
        </div>
        <div className="mt-1.5 rounded-lg border border-white/10 bg-white/5 p-2.5 font-mono text-[11px] leading-relaxed text-neutral-200">
          HRI = Σ wᵢ · nᵢ / Σ wᵢ
          <div className="mt-1 space-y-0.5 text-[10px] text-neutral-400">
            {(Object.keys(DEFAULT_WEIGHTS) as FactorKey[])
              .filter((k) => DEFAULT_WEIGHTS[k] > 0)
              .map((k) => (
                <div key={k} className="grid grid-cols-[2.2rem_1fr] gap-2">
                  <span className="text-sky-300">{DEFAULT_WEIGHTS[k].toFixed(2)}</span>
                  <span>
                    <span className="text-neutral-200">{FACTOR_LABELS[k].replace(/ \(.*\)$/, "")}</span>
                    <span className="text-neutral-500"> · {NORMALIZATION[k]}</span>
                  </span>
                </div>
              ))}
          </div>
        </div>
        <div className="mt-1.5 text-[10px] leading-snug text-neutral-500">
          Every input is normalized to 0–100 and weighted. The heat index uses
          the Rothfusz formula on the IMD air temperature and humidity; land-
          surface temperature is the satellite reading for the zone; tree cover,
          built-up and traffic come from the GIS/satellite snapshot.
          <br />
          Bands: <span className="text-green-300">Low 0–{THRESHOLDS.MODERATE - 1}</span> ·{" "}
          <span className="text-yellow-300">Moderate {THRESHOLDS.MODERATE}–{THRESHOLDS.HIGH - 1}</span> ·{" "}
          <span className="text-orange-300">High {THRESHOLDS.HIGH}–{THRESHOLDS.CRITICAL - 1}</span> ·{" "}
          <span className="text-red-300">Critical {THRESHOLDS.CRITICAL}–100</span>.
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Risk index · {city.name} · observed {formatHour(hour)} IST
        </div>
        <div className="mt-1.5 space-y-1.5">
          {risks.map((r) => (
            <motion.button
              key={r.zone.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onSelect(r)}
              className="block w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left hover:bg-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-neutral-100">
                  {r.zone.name}
                  <span className="ml-1 text-[10px] text-neutral-500">{r.zone.statics.wardNumber}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-base font-bold tabular-nums"
                    style={{ color: LEVEL_COLORS[r.level] }}
                  >
                    {r.hri}
                  </span>
                  <LevelBadge level={r.level} />
                </span>
              </div>
              <div className="mt-1.5">
                <FactorBars risk={r} compact />
              </div>
              <div className="mt-1 text-[10px] text-neutral-500">
                Air {r.airTempC.toFixed(1)} °C · heat index {r.heatIndexC.toFixed(1)} °C · surface{" "}
                {r.lstC.toFixed(0)} °C · feels like {r.feelsLikeC.toFixed(0)} °C on the street
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

const RECIPIENT_ICON: Record<string, string> = {
  "Ward officer": "🏛️",
  "Local health centre": "🏥",
  "Traffic control room": "🚦",
};

/** Section: threshold-based alerts. */
export function AlertsSection({
  alerts,
  onAck,
  isAuthority,
}: {
  alerts: HeatAlert[];
  onAck: (id: string) => void;
  isAuthority: boolean;
}) {
  const open = alerts.filter((a) => !a.acknowledged).length;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          🔔 Threshold-based alerts
        </span>
        {open > 0 && (
          <span className="rounded-full bg-red-500/25 px-2 py-0.5 text-[10px] font-bold text-red-300">
            {open} open
          </span>
        )}
      </div>
      <div className="mt-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[10px] leading-snug text-neutral-400">
        <span className="text-neutral-200">Trigger:</span> a zone enters the{" "}
        <span className="text-orange-300">High (≥{THRESHOLDS.HIGH})</span> or{" "}
        <span className="text-red-300">Critical (≥{THRESHOLDS.CRITICAL})</span> band.{" "}
        <span className="text-neutral-200">Routing:</span> 🏛️ ward officer always · 🏥
        health centre for Critical or ≥25 % informal settlement · 🚦 traffic control
        where traffic ≥0.7. <span className="text-neutral-200">De-dup:</span> one alert per
        zone per level per day. <span className="text-neutral-200">Escalation:</span> Critical
        unanswered for 2 h → Zonal Deputy Commissioner.
      </div>
      {alerts.length === 0 ? (
        <div className="mt-2 text-[11px] text-neutral-500">No zone is above High right now.</div>
      ) : (
        <div className="mt-2 space-y-1">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
                a.acknowledged ? "border-white/10 bg-white/5 opacity-70" : "border-white/15 bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-neutral-100">{a.zoneName}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: `${LEVEL_COLORS[a.level]}26`, color: LEVEL_COLORS[a.level] }}
                >
                  {a.level} · {a.hri}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-neutral-500">
                <span title={a.recipients.join(", ")}>
                  {formatHour(a.hour)} → {a.recipients.map((r) => RECIPIENT_ICON[r] ?? "•").join(" ")}{" "}
                  {a.recipients.join(", ")} · SMS (simulated)
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                {a.acknowledged ? (
                  <span className="text-[10px] text-green-300">
                    ✓ acknowledged {a.ackHour !== undefined && formatHour(a.ackHour)}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-300">awaiting acknowledgement</span>
                )}
                {!a.acknowledged && isAuthority && (
                  <button
                    onClick={() => onAck(a.id)}
                    className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-200 hover:bg-white/10"
                  >
                    ACK
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STEP_LABEL: Record<string, string> = {
  OPEN: "Ticket opened",
  DISPATCHED: "Dispatched",
  ON_SITE: "On site",
  RESOLVED: "Resolved",
};

/** Section (resident side): relief status for my zone, from authority to residence. */
export function ResidentResponse({
  city,
  risks,
  alerts,
  tickets,
  zoneId,
  onZone,
}: {
  city: City;
  risks: ZoneRisk[];
  alerts: HeatAlert[];
  tickets: Ticket[];
  zoneId: string;
  onZone: (id: string) => void;
}) {
  const risk = risks.find((r) => r.zone.id === zoneId) ?? risks[0];
  const zoneAlerts = alerts.filter((a) => a.zoneId === risk.zone.id);
  const zoneTickets = tickets.filter((t) => t.zoneId === risk.zone.id);
  const latestAlert = zoneAlerts[zoneAlerts.length - 1];
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          🏠 Relief status for my zone
        </span>
        <select
          value={risk.zone.id}
          onChange={(e) => onZone(e.target.value)}
          className="max-w-[10rem] rounded-md border border-white/15 bg-black/60 px-1.5 py-0.5 text-[11px] text-neutral-200 outline-none"
        >
          {city.zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-2xl font-bold" style={{ color: LEVEL_COLORS[risk.level] }}>
          {risk.hri}
        </span>
        <LevelBadge level={risk.level} />
        <span className="text-[11px] text-neutral-400">
          feels like {risk.feelsLikeC.toFixed(0)} °C
        </span>
      </div>

      {/* Step 1: alert */}
      <div className="mt-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px]">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">1 · Alert</div>
        {latestAlert ? (
          <div className="mt-0.5 text-neutral-200">
            {latestAlert.level} alert raised {formatHour(latestAlert.hour)} →{" "}
            {latestAlert.recipients.join(", ")}.{" "}
            {latestAlert.acknowledged ? (
              <span className="text-green-300">Acknowledged by the authority{latestAlert.ackHour !== undefined && ` at ${formatHour(latestAlert.ackHour)}`}.</span>
            ) : (
              <span className="text-amber-300">Awaiting acknowledgement.</span>
            )}
          </div>
        ) : (
          <div className="mt-0.5 text-neutral-400">No threshold alert for this zone — risk is below High.</div>
        )}
      </div>

      {/* Step 2–4: tickets */}
      <div className="mt-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px]">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">2 · Relief on the way</div>
        {zoneTickets.length === 0 ? (
          <div className="mt-0.5 text-neutral-400">
            No relief measure dispatched yet for {risk.zone.name}.
          </div>
        ) : (
          <div className="mt-1 space-y-2">
            {zoneTickets.map((t) => {
              const doneIdx = STATUS_FLOW.indexOf(t.status);
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-neutral-100">
                      {MEASURES[t.measure].icon} {MEASURES[t.measure].label}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-500">{t.id}</span>
                  </div>
                  <ol className="mt-1 grid grid-cols-4 gap-1">
                    {STATUS_FLOW.map((s, i) => {
                      const ev = t.history.find((h) => h.status === s);
                      const done = i <= doneIdx;
                      return (
                        <li key={s} className="text-center">
                          <div
                            className="mx-auto h-1.5 rounded"
                            style={{ background: done ? "#22c55e" : "rgba(255,255,255,0.12)" }}
                          />
                          <div className={`mt-0.5 text-[9px] ${done ? "text-green-300" : "text-neutral-600"}`}>
                            {STEP_LABEL[s]}
                          </div>
                          {ev && (
                            <div className="text-[9px] text-neutral-500">{formatHour(ev.hour)} · {ev.officer}</div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {t.outcomeNotes && (
                    <div className="mt-1 text-[10px] text-neutral-400">Outcome: “{t.outcomeNotes}”</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-1.5 text-[10px] leading-snug text-neutral-500">
        This is what a resident or worker in {risk.zone.name} sees: the alert the
        authority received, whether it was acknowledged, and each relief measure
        from dispatch to resolution — stamped by officer and time.
      </div>
    </div>
  );
}

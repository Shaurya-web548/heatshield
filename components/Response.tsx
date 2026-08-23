"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HeatAlert } from "@/lib/alerts";
import type { ZoneRisk } from "@/lib/heat";
import { formatHour, LEVEL_COLORS } from "@/lib/heat";
import {
  MEASURES,
  nextStatus,
  recommendations,
  responseStats,
  wardAnalytics,
  type Measure,
  type Ticket,
} from "@/lib/response";

// Demo credential — documented in the README and printed under the field, so
// anyone reviewing the prototype can sign in.
const ACCESS_CODE = "HEAT-1070";

export function AuthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (officerId: string) => void;
}) {
  const [officerId, setOfficerId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!officerId.trim()) return setError("Enter your officer ID.");
    if (code.trim().toUpperCase() !== ACCESS_CODE)
      return setError("Invalid access code. Contact the municipal control room.");
    setError(null);
    onSuccess(officerId.trim());
    setOfficerId("");
    setCode("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[2100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 w-full max-w-sm rounded-2xl border border-amber-400/30 bg-neutral-950/95 p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded px-1.5 text-sm text-neutral-500 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
              🛡️ Restricted — municipal officers only
            </div>
            <h2 className="mt-1 text-lg font-semibold">Response console sign-in</h2>
            <p className="mt-1 text-xs leading-snug text-neutral-400">
              Dispatching relief measures and closing tickets is limited to
              authorised municipal officers.
            </p>
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Officer ID
            </label>
            <input
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              placeholder="e.g. AMC-HAP-017"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-400/50"
            />
            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Access code
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-400/50"
            />
            <p className="mt-1.5 text-[11px] text-neutral-400">
              Prototype access code:{" "}
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono font-semibold text-amber-200">
                {ACCESS_CODE}
              </span>{" "}
              — shown here on purpose so anyone reviewing the demo can sign in.
            </p>
            {error && <p className="mt-2 text-xs font-medium text-red-400">{error}</p>}
            <button
              onClick={submit}
              className="mt-4 w-full rounded-lg bg-amber-500 py-2 text-sm font-bold tracking-wide text-black hover:bg-amber-400"
            >
              SIGN IN
            </button>
            <p className="mt-3 text-[10px] leading-snug text-neutral-600">
              Demo authentication — a real deployment would use municipal SSO /
              OTP. No credentials are stored or transmitted.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: "text-neutral-300 border-white/20",
  DISPATCHED: "text-sky-300 border-sky-400/40",
  ON_SITE: "text-amber-300 border-amber-400/40",
  RESOLVED: "text-green-300 border-green-400/40",
};

export function ResponseConsole({
  hour,
  risks,
  alerts,
  tickets,
  officer,
  onDispatch,
  onAdvance,
  onExport,
  onExportHistory,
  onReset,
}: {
  hour: number;
  risks: ZoneRisk[];
  alerts: HeatAlert[];
  tickets: Ticket[];
  officer: string;
  onDispatch: (risk: ZoneRisk, measure: Measure) => void;
  onAdvance: (id: string, notes?: string) => void;
  onExport: () => void;
  onExportHistory: () => void;
  onReset: () => void;
}) {
  const recs = recommendations(risks, tickets);
  const stats = responseStats(tickets);
  const analytics = wardAnalytics(alerts, tickets, hour);
  const active = tickets.filter((t) => t.status !== "RESOLVED");
  const resolved = tickets.filter((t) => t.status === "RESOLVED");
  const trail = tickets
    .flatMap((t) => t.history.map((e) => ({ ...e, ticket: t })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);
  const [measureFor, setMeasureFor] = useState<Record<string, Measure>>({});
  const [notesFor, setNotesFor] = useState<Record<string, string>>({});

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
          🛡️ Response console · {formatHour(hour)}
        </span>
        <span className="text-[10px] text-neutral-500">{officer}</span>
      </div>

      {/* KPIs */}
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        {[
          ["Open", stats.open, "text-amber-300"],
          ["Resolved", stats.resolved, "text-green-300"],
          [
            "Alert→dispatch",
            stats.avgDispatchMin === null ? "—" : `${stats.avgDispatchMin} min`,
            "text-sky-300",
          ],
        ].map(([label, val, cls]) => (
          <div key={String(label)} className="rounded-lg border border-white/10 bg-white/5 py-1.5">
            <div className={`font-mono text-base font-bold ${cls}`}>{val}</div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-500">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Neglected zones */}
      {analytics.neglected.length > 0 && (
        <div className="mt-2 rounded-lg border border-red-400/30 bg-red-950/30 px-2 py-1.5 text-[11px]">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-red-300">
            ⚠️ Alerted, no response yet
          </div>
          {analytics.neglected.slice(0, 4).map((n) => (
            <div key={n.zoneName} className="flex justify-between text-neutral-200">
              <span className="truncate">{n.zoneName}</span>
              <span className="font-mono text-neutral-400">
                {n.level} · {n.sinceMin} min
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recommended actions */}
      <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Recommended actions ({recs.length})
      </div>
      {recs.length === 0 ? (
        <div className="mt-1 text-[11px] text-neutral-500">
          No zone above HIGH without an active response.
        </div>
      ) : (
        <div className="mt-1 max-h-40 space-y-1 overflow-y-auto pr-0.5">
          {recs.map(({ risk, measure, reason }) => {
            const chosen = measureFor[risk.zone.id] ?? measure;
            return (
              <div
                key={risk.zone.id}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-neutral-100">
                    {risk.zone.name}
                  </span>
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: LEVEL_COLORS[risk.level] }}
                  >
                    {risk.level} {risk.hri}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500">{reason}</div>
                <div className="mt-1 flex gap-1.5">
                  <select
                    value={chosen}
                    onChange={(e) =>
                      setMeasureFor((m) => ({
                        ...m,
                        [risk.zone.id]: e.target.value as Measure,
                      }))
                    }
                    className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/60 px-1.5 py-1 text-[11px] text-neutral-200 outline-none"
                  >
                    {(Object.keys(MEASURES) as Measure[]).map((m) => (
                      <option key={m} value={m}>
                        {MEASURES[m].icon} {MEASURES[m].label}
                      </option>
                    ))}
                  </select>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onDispatch(risk, chosen)}
                    className="shrink-0 rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-black hover:bg-amber-400"
                  >
                    DISPATCH
                  </motion.button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active tickets */}
      <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Active tickets ({active.length})
      </div>
      <div className="mt-1 max-h-48 space-y-1 overflow-y-auto pr-0.5">
        {active.length === 0 && (
          <div className="text-[11px] text-neutral-500">None yet — dispatch from the list above.</div>
        )}
        {active.map((t) => {
          const nxt = nextStatus(t.status);
          const resolving = nxt === "RESOLVED";
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-neutral-100">
                  {MEASURES[t.measure].icon} {MEASURES[t.measure].label} → {t.zoneName}
                </span>
                <span className="font-mono text-[10px] text-neutral-500">{t.id}</span>
              </div>
              {resolving && (
                <input
                  value={notesFor[t.id] ?? ""}
                  onChange={(e) => setNotesFor((n) => ({ ...n, [t.id]: e.target.value }))}
                  placeholder="Outcome notes (e.g. 2,000 L distributed, 40 workers rested)"
                  className="mt-1 w-full rounded-md border border-white/15 bg-black/50 px-2 py-1 text-[11px] text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-green-400/50"
                />
              )}
              <div className="mt-1 flex items-center justify-between gap-2">
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status]}`}
                >
                  {t.status.replace("_", " ")}
                </span>
                {nxt && (
                  <button
                    onClick={() => onAdvance(t.id, notesFor[t.id])}
                    className="rounded-md border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-neutral-200 hover:bg-white/10"
                  >
                    → {nxt.replace("_", " ")}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Resolved with outcomes */}
      {resolved.length > 0 && (
        <>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Resolved ({resolved.length})
          </div>
          <div className="mt-1 max-h-28 space-y-0.5 overflow-y-auto text-[10px]">
            {[...resolved].reverse().map((t) => (
              <div key={t.id} className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                <div className="flex justify-between gap-2 text-neutral-300">
                  <span className="truncate">
                    {MEASURES[t.measure].icon} {t.zoneName}
                  </span>
                  <span className="shrink-0 text-green-300">
                    {t.riskAtResolve ? `risk now ${t.riskAtResolve}` : "resolved"}
                  </span>
                </div>
                {t.outcomeNotes && (
                  <div className="truncate text-neutral-500">“{t.outcomeNotes}”</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ward analytics */}
      {analytics.perZone.length > 0 && (
        <>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Ward analytics
          </div>
          <div className="mt-1 grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-0.5 text-[10px]">
            <span className="text-neutral-500">zone</span>
            <span className="text-right text-neutral-500">alerts</span>
            <span className="text-right text-neutral-500">tickets</span>
            <span className="text-right text-neutral-500">resp.</span>
            {analytics.perZone.slice(0, 6).map((z) => (
              <div key={z.zoneId} className="contents">
                <span className="truncate text-neutral-300">{z.zoneName}</span>
                <span className="text-right font-mono text-neutral-300">{z.alerts}</span>
                <span className={`text-right font-mono ${z.tickets === 0 ? "text-red-300" : "text-neutral-300"}`}>
                  {z.tickets}
                </span>
                <span className="text-right font-mono text-sky-300">
                  {z.avgDispatchMin === null ? "—" : `${z.avgDispatchMin}m`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Accountability trail */}
      {trail.length > 0 && (
        <>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Accountability log
          </div>
          <div className="mt-1 space-y-0.5">
            {trail.map((e, i) => (
              <div key={i} className="flex justify-between gap-2 text-[10px]">
                <span className="truncate text-neutral-400">
                  <span className="font-mono text-neutral-500">{formatHour(e.hour)}</span>{" "}
                  {e.ticket.zoneName} · {e.status.replace("_", " ")}
                </span>
                <span className="shrink-0 text-neutral-500">{e.officer}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 flex gap-1.5">
        <button
          onClick={onExport}
          disabled={tickets.length === 0}
          className="flex-1 rounded-lg border border-white/15 py-1.5 text-[11px] font-semibold text-neutral-200 hover:bg-white/10 disabled:opacity-40"
        >
          ⬇️ Response log CSV
        </button>
        <button
          onClick={onExportHistory}
          className="flex-1 rounded-lg border border-white/15 py-1.5 text-[11px] font-semibold text-neutral-200 hover:bg-white/10"
        >
          ⬇️ Readings CSV
        </button>
        <button
          onClick={onReset}
          disabled={tickets.length === 0}
          className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-neutral-400 hover:bg-white/10 disabled:opacity-40"
          title="Clear all tickets for this city"
        >
          Reset
        </button>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-neutral-600">
        Tickets and hourly readings persist in this browser. Simulated dispatch
        — no real units are moved.
      </p>
    </div>
  );
}

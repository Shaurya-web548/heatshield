"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { HeatAlert } from "@/lib/alerts";
import { formatHour, LEVEL_COLORS } from "@/lib/heat";
import { useDefaultCollapsedOnMobile } from "@/lib/useCollapsed";

export function WarningBanners({ banners }: { banners: string[] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-6 z-[1100] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {banners.map((text) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className={`max-w-[92vw] rounded-xl border px-4 py-2 text-center text-xs font-medium shadow-2xl backdrop-blur-md sm:px-5 sm:py-2.5 sm:text-sm ${
              text.startsWith("🔥") || text.startsWith("⏫")
                ? "border-red-500/40 bg-red-950/85 text-red-100"
                : text.startsWith("⚠")
                  ? "border-orange-500/40 bg-orange-950/85 text-orange-100"
                  : "border-amber-500/40 bg-amber-950/85 text-amber-100"
            }`}
          >
            {text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const RECIPIENT_ICON: Record<string, string> = {
  "Ward officer": "🏛️",
  "Local health centre": "🏥",
  "Traffic control room": "🚦",
};

export function AlertLog({
  alerts,
  onAck,
}: {
  alerts: HeatAlert[];
  onAck: (id: string) => void;
}) {
  const open = alerts.filter((a) => !a.acknowledged).length;
  const [expanded, toggle] = useDefaultCollapsedOnMobile();
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.9 }}
      className={`${expanded ? "w-64" : "w-auto"} rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 shadow-xl backdrop-blur-md sm:py-3`}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={toggle}
          className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400"
        >
          🔔 Threshold alerts {expanded ? "✕" : "▸"}
        </button>
        {open > 0 && (
          <span className="rounded-full bg-red-500/25 px-2 py-0.5 text-[10px] font-bold text-red-300">
            {open} open
          </span>
        )}
      </div>

      {!expanded ? null : alerts.length === 0 ? (
        <div className="mt-1.5 text-[11px] text-neutral-500">
          No zone has crossed HIGH yet. Alerts fire automatically as the day
          heats; unanswered CRITICAL alerts escalate after 2 h.
        </div>
      ) : (
        <div className="mt-1.5 max-h-52 space-y-1 overflow-y-auto">
          <AnimatePresence initial={false}>
            {[...alerts].reverse().map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-lg border px-2 py-1.5 text-[11px] ${
                  a.escalated && !a.acknowledged
                    ? "border-red-400/60 bg-red-950/40"
                    : a.acknowledged
                      ? "border-white/10 bg-white/5 opacity-60"
                      : "border-white/15 bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-neutral-400">
                    {formatHour(a.hour)}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: `${LEVEL_COLORS[a.level]}26`,
                      color: LEVEL_COLORS[a.level],
                    }}
                  >
                    {a.level} · {a.hri}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-medium text-neutral-100">
                  {a.zoneName}
                </div>
                <div className="mt-0.5 text-[10px] text-neutral-500" title={a.recipients.join(", ")}>
                  → {a.recipients.map((r) => RECIPIENT_ICON[r] ?? "•").join(" ")}{" "}
                  {a.recipients.length} recipient{a.recipients.length > 1 ? "s" : ""} · SMS (simulated)
                </div>
                {a.escalated && (
                  <div className="mt-0.5 text-[10px] font-semibold text-red-300">
                    ⏫ escalated {a.escalatedHour !== undefined && formatHour(a.escalatedHour)} → {a.escalatedTo}
                  </div>
                )}
                {a.acknowledged ? (
                  <div className="text-[10px] text-neutral-500">
                    ✓ acknowledged {a.ackHour !== undefined && formatHour(a.ackHour)}
                  </div>
                ) : (
                  <div className="mt-1 flex justify-end">
                    <button
                      onClick={() => onAck(a.id)}
                      className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-200 hover:bg-white/10"
                    >
                      ACK
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// Threshold-based alerts: one alert per zone per level reached, per day.
// Escalations (→ ALERT, → CRITICAL) notify authorities; de-escalations are
// logged only. Pure functions so the page effect stays tiny.

import { LEVEL_ORDER, type RiskLevel, type ZoneRisk } from "@/lib/heat";

export type HeatAlert = {
  id: string; // `${zoneId}:${level}`
  hour: number;
  zoneId: string;
  zoneName: string;
  level: RiskLevel;
  hri: number;
  acknowledged: boolean;
  ackHour?: number;
};

export const NOTIFY_LEVELS: RiskLevel[] = ["ALERT", "CRITICAL"];

const rank = (l: RiskLevel) => LEVEL_ORDER.indexOf(l);

/**
 * Diff previous vs current levels. Returns new alerts for escalations into
 * a notify level that have not already been raised today.
 */
export function detectEscalations(
  prev: Map<string, RiskLevel>,
  risks: ZoneRisk[],
  hour: number,
  existing: HeatAlert[]
): HeatAlert[] {
  const seen = new Set(existing.map((a) => a.id));
  const out: HeatAlert[] = [];
  for (const r of risks) {
    const before = prev.get(r.zone.id);
    if (before !== undefined && rank(r.level) > rank(before)) {
      // May have jumped more than one level in a single frame — raise each.
      for (const l of NOTIFY_LEVELS) {
        if (rank(l) > rank(before) && rank(l) <= rank(r.level)) {
          const id = `${r.zone.id}:${l}`;
          if (!seen.has(id)) {
            seen.add(id);
            out.push({
              id,
              hour,
              zoneId: r.zone.id,
              zoneName: r.zone.name,
              level: l,
              hri: r.hri,
              acknowledged: false,
            });
          }
        }
      }
    }
  }
  return out;
}

/**
 * One banner per level, naming up to three zones — many zones cross a
 * threshold within seconds of sim-time, so per-zone banners would stack.
 */
export function alertBanners(fresh: HeatAlert[]): string[] {
  const out: string[] = [];
  for (const level of [...NOTIFY_LEVELS].reverse()) {
    const names = fresh.filter((a) => a.level === level).map((a) => a.zoneName);
    if (names.length === 0) continue;
    const shown = names.slice(0, 3).join(", ");
    const more = names.length > 3 ? ` +${names.length - 3} more` : "";
    out.push(
      level === "CRITICAL"
        ? names.length === 1
          ? `🔥 ${shown} is now CRITICAL — ward officer notified`
          : `🔥 ${names.length} zones now CRITICAL: ${shown}${more} — ward officers notified`
        : names.length === 1
          ? `⚠ ${shown} has reached ALERT`
          : `⚠ ${names.length} zones reached ALERT: ${shown}${more}`
    );
  }
  return out;
}

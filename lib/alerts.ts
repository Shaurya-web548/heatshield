// Threshold-based alerts.
//   Trigger: a zone crosses into HIGH or CRITICAL.
//   Recipients: role-based routing (ward officer, health centre, traffic control).
//   De-dup: one alert per zone per level per day.
//   Escalation: CRITICAL unanswered for 2 h → next authority tier.

import { LEVEL_ORDER, type RiskLevel, type ZoneRisk } from "@/lib/heat";

export type Recipient = "Ward officer" | "Local health centre" | "Traffic control room";

export type HeatAlert = {
  id: string; // `${zoneId}:${level}` (or `${zoneId}:ESC`)
  hour: number;
  zoneId: string;
  zoneName: string;
  level: RiskLevel;
  hri: number;
  recipients: Recipient[];
  acknowledged: boolean;
  ackHour?: number;
  escalated?: boolean; // auto-escalated to the next tier
  escalatedTo?: string;
  escalatedHour?: number;
};

export const NOTIFY_LEVELS: RiskLevel[] = ["HIGH", "CRITICAL"];
export const ESCALATE_AFTER_HOURS = 2;
export const ESCALATION_TIER = "Zonal Deputy Commissioner";

const rank = (l: RiskLevel) => LEVEL_ORDER.indexOf(l);

/** Role-based routing: who gets this alert. */
export function recipientsFor(r: ZoneRisk, level: RiskLevel): Recipient[] {
  const out: Recipient[] = ["Ward officer"];
  if (level === "CRITICAL" || r.zone.statics.informalSettlementPct >= 25)
    out.push("Local health centre");
  if (r.zone.factors.traffic >= 0.7) out.push("Traffic control room");
  return out;
}

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
              recipients: recipientsFor(r, l),
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
 * CRITICAL alerts with no acknowledgement and no response ticket for
 * ESCALATE_AFTER_HOURS while the zone is still critical → escalate once.
 */
export function detectOverdue(
  alerts: HeatAlert[],
  risks: ZoneRisk[],
  hour: number,
  zonesWithResponse: Set<string>
): string[] {
  const stillCritical = new Set(
    risks.filter((r) => r.level === "CRITICAL").map((r) => r.zone.id)
  );
  return alerts
    .filter(
      (a) =>
        a.level === "CRITICAL" &&
        !a.acknowledged &&
        !a.escalated &&
        !zonesWithResponse.has(a.zoneId) &&
        stillCritical.has(a.zoneId) &&
        hour - a.hour >= ESCALATE_AFTER_HOURS
    )
    .map((a) => a.id);
}

/** One banner per level, naming up to three zones. */
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
          ? `🔥 ${shown} is now CRITICAL — ward officer and health centre notified`
          : `🔥 ${names.length} zones now CRITICAL: ${shown}${more} — ward officers notified`
        : names.length === 1
          ? `⚠ ${shown} has reached HIGH heat risk`
          : `⚠ ${names.length} zones reached HIGH: ${shown}${more}`
    );
  }
  return out;
}

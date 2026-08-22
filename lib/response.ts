// Response tracking: relief measures dispatched to zones, tracked as tickets
// through a lifecycle with an accountability trail. Persisted in
// localStorage so the demo survives a refresh; exported as CSV for audit.

import type { HeatAlert } from "@/lib/alerts";
import { formatHour, type ZoneRisk } from "@/lib/heat";

export type Measure =
  | "water_tanker"
  | "shade_tent"
  | "ors_kiosk"
  | "cooling_centre"
  | "work_hours";

export const MEASURES: Record<Measure, { label: string; icon: string }> = {
  water_tanker: { label: "Water tanker", icon: "🚚" },
  shade_tent: { label: "Shade tent", icon: "⛺" },
  ors_kiosk: { label: "ORS kiosk", icon: "🧂" },
  cooling_centre: { label: "Open cooling centre", icon: "❄️" },
  work_hours: { label: "Work-hours advisory", icon: "📣" },
};

export type TicketStatus = "OPEN" | "DISPATCHED" | "ON_SITE" | "RESOLVED";
export const STATUS_FLOW: TicketStatus[] = ["OPEN", "DISPATCHED", "ON_SITE", "RESOLVED"];

export type TicketEvent = {
  status: TicketStatus;
  hour: number; // simulation clock
  at: string; // real wall-clock ISO, for the audit trail
  officer: string;
};

export type Ticket = {
  id: string;
  cityId: string;
  zoneId: string;
  zoneName: string;
  measure: Measure;
  status: TicketStatus;
  alertHour: number | null; // when the zone's alert fired (for response time)
  history: TicketEvent[];
};

export const nextStatus = (s: TicketStatus): TicketStatus | null => {
  const i = STATUS_FLOW.indexOf(s);
  return i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
};

export function createTicket(
  cityId: string,
  zone: { id: string; name: string },
  measure: Measure,
  hour: number,
  officer: string,
  alerts: HeatAlert[]
): Ticket {
  const zoneAlerts = alerts.filter((a) => a.zoneId === zone.id);
  const alertHour = zoneAlerts.length
    ? Math.min(...zoneAlerts.map((a) => a.hour))
    : null;
  return {
    id: `T-${Date.now().toString(36).slice(-5).toUpperCase()}`,
    cityId,
    zoneId: zone.id,
    zoneName: zone.name,
    measure,
    status: "OPEN",
    alertHour,
    history: [{ status: "OPEN", hour, at: new Date().toISOString(), officer }],
  };
}

export function advanceTicket(t: Ticket, hour: number, officer: string): Ticket {
  const next = nextStatus(t.status);
  if (!next) return t;
  return {
    ...t,
    status: next,
    history: [
      ...t.history,
      { status: next, hour, at: new Date().toISOString(), officer },
    ],
  };
}

/** Suggested measure per zone needing action (no open ticket yet). */
export function recommendations(
  risks: ZoneRisk[],
  tickets: Ticket[]
): { risk: ZoneRisk; measure: Measure; reason: string }[] {
  const covered = new Set(
    tickets.filter((t) => t.status !== "RESOLVED").map((t) => t.zoneId)
  );
  return risks
    .filter((r) => (r.level === "CRITICAL" || r.level === "ALERT") && !covered.has(r.zone.id))
    .map((r) => ({
      risk: r,
      measure:
        r.level === "CRITICAL"
          ? r.zone.factors.workers >= 0.7
            ? "water_tanker"
            : "shade_tent"
          : r.zone.factors.treeCover < 0.15
            ? "ors_kiosk"
            : "work_hours",
      reason:
        r.level === "CRITICAL"
          ? `HRI ${r.hri}, feels like ${r.feelsLikeC.toFixed(0)} °C, ${Math.round(r.zone.factors.workers * 100)}% worker density`
          : `HRI ${r.hri}, tree cover ${Math.round(r.zone.factors.treeCover * 100)}%`,
    }));
}

/** KPIs for the accountability header. */
export function responseStats(tickets: Ticket[]) {
  const open = tickets.filter((t) => t.status !== "RESOLVED").length;
  const resolved = tickets.filter((t) => t.status === "RESOLVED").length;
  const dispatchTimes = tickets
    .map((t) => {
      const d = t.history.find((h) => h.status === "DISPATCHED");
      return t.alertHour !== null && d ? (d.hour - t.alertHour) * 60 : null;
    })
    .filter((m): m is number => m !== null);
  const avgDispatchMin = dispatchTimes.length
    ? Math.round(dispatchTimes.reduce((s, m) => s + m, 0) / dispatchTimes.length)
    : null;
  return { open, resolved, total: tickets.length, avgDispatchMin };
}

export function ticketsToCsv(tickets: Ticket[]): string {
  const header = [
    "ticket_id", "city", "zone", "measure", "status", "alert_hour",
    "event_status", "event_sim_time", "event_wall_clock", "officer",
  ];
  const rows = tickets.flatMap((t) =>
    t.history.map((e) => [
      t.id, t.cityId, t.zoneName, MEASURES[t.measure].label, t.status,
      t.alertHour === null ? "" : formatHour(t.alertHour),
      e.status, formatHour(e.hour), e.at, e.officer,
    ])
  );
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

const storageKey = (cityId: string) => `heatshield-tickets-${cityId}`;

export function loadTickets(cityId: string): Ticket[] {
  try {
    const raw = localStorage.getItem(storageKey(cityId));
    return raw ? (JSON.parse(raw) as Ticket[]) : [];
  } catch {
    return [];
  }
}

export function saveTickets(cityId: string, tickets: Ticket[]) {
  try {
    localStorage.setItem(storageKey(cityId), JSON.stringify(tickets));
  } catch {
    // storage unavailable (private mode) — tickets live in memory only
  }
}

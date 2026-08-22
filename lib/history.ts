// Layer 3 — Storage: a time-series of hourly zone readings per city, kept in
// localStorage (a spreadsheet/CSV-backed store is explicitly fine for a
// prototype). Feeds the analytics and the zone-table export.

import { formatHour, type ZoneRisk } from "@/lib/heat";

export type Reading = {
  hour: number;
  zoneId: string;
  hri: number;
  level: string;
  airTempC: number;
  lstC: number;
  recordedAt: string; // wall clock ISO — the last_updated_timestamp
};

const key = (cityId: string) => `heatshield-history-${cityId}`;

export function loadHistory(cityId: string): Reading[] {
  try {
    const raw = localStorage.getItem(key(cityId));
    return raw ? (JSON.parse(raw) as Reading[]) : [];
  } catch {
    return [];
  }
}

/** Record this hour's readings (replacing any earlier record of the same hour). */
export function recordHour(
  cityId: string,
  hour: number,
  risks: ZoneRisk[]
): Reading[] {
  const now = new Date().toISOString();
  const prev = loadHistory(cityId).filter((r) => r.hour !== hour);
  const next = [
    ...prev,
    ...risks.map((r) => ({
      hour,
      zoneId: r.zone.id,
      hri: r.hri,
      level: r.level,
      airTempC: +r.airTempC.toFixed(1),
      lstC: +r.lstC.toFixed(1),
      recordedAt: now,
    })),
  ].sort((a, b) => a.hour - b.hour);
  try {
    localStorage.setItem(key(cityId), JSON.stringify(next));
  } catch {
    // storage unavailable — history lives in memory only
  }
  return next;
}

export function clearHistory(cityId: string) {
  try {
    localStorage.removeItem(key(cityId));
  } catch {
    // ignore
  }
}

export function historyToCsv(readings: Reading[]): string {
  const header = ["sim_time", "zone_id", "hri", "risk_level", "air_temp_c", "lst_c", "recorded_at"];
  const rows = readings.map((r) => [
    formatHour(r.hour), r.zoneId, r.hri, r.level, r.airTempC, r.lstC, r.recordedAt,
  ]);
  return [header, ...rows].map((r) => r.join(",")).join("\n");
}

/** Peak HRI per zone for the recorded day. */
export function peaksByZone(readings: Reading[]): Record<string, { hri: number; hour: number }> {
  const out: Record<string, { hri: number; hour: number }> = {};
  for (const r of readings) {
    if (!out[r.zoneId] || r.hri > out[r.zoneId].hri) out[r.zoneId] = { hri: r.hri, hour: r.hour };
  }
  return out;
}

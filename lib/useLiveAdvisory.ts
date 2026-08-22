"use client";

import { useEffect, useRef, useState } from "react";
import type { City } from "@/data/cities";
import type { Advisory } from "@/lib/advisories";
import { nearestCooling } from "@/lib/advisories";
import { airTempC, humidityPct, type SimParams, type ZoneRisk } from "@/lib/heat";

const CLIENT_TIMEOUT_MS = 4000;
const VALID = new Set(["ADVISORY", "WARNING", "EMERGENCY"]);

/**
 * Optional live-AI advisory. Tries /api/advise once per city+hour (snapshot
 * only — what-if states are never sent), caches successes, memoizes
 * failures, and on ANY error the generated advisory simply stays in place.
 */
export function useLiveAdvisory(
  city: City,
  wholeHour: number,
  risks: ZoneRisk[],
  params: SimParams,
  fallback: Advisory
): { advisory: Advisory; isLive: boolean } {
  const key = `${city.id}:${wholeHour}`;
  const [live, setLive] = useState<Map<string, Advisory>>(() => new Map());
  const inFlight = useRef<Set<string>>(new Set());
  const failed = useRef<Set<string>>(new Set());
  const whatIf =
    params.tempDeltaC !== 0 ||
    params.humidityDeltaPct !== 0 ||
    Object.values(params.greening).some((g) => g > 0);

  useEffect(() => {
    if (whatIf || live.has(key) || inFlight.current.has(key) || failed.current.has(key))
      return;
    inFlight.current.add(key);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    const top = risks[0];
    fetch("/api/advise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: city.name,
        hour: wholeHour,
        imd: city.imd,
        airTempC: +airTempC(city, wholeHour).toFixed(1),
        humidityPct: Math.round(humidityPct(city, wholeHour)),
        zones: risks.map((r) => ({
          name: r.zone.name,
          hri: r.hri,
          level: r.level,
          feelsLikeC: +r.feelsLikeC.toFixed(1),
        })),
        nearestCoolingForWorstZone: nearestCooling(city, top.zone.center).point.name,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const a = await res.json();
        if (
          a.ok !== true ||
          typeof a.headline !== "string" ||
          typeof a.advisory_en !== "string" ||
          typeof a.advisory_hi !== "string" ||
          !VALID.has(a.urgency)
        )
          throw new Error("shape");
        setLive((old) => new Map(old).set(key, a as Advisory));
      })
      .catch(() => {
        failed.current.add(key); // silent
      })
      .finally(() => {
        clearTimeout(timer);
        inFlight.current.delete(key);
      });
  }, [key, whatIf, live, city, wholeHour, risks]);

  const hit = !whatIf ? live.get(key) : undefined;
  return { advisory: hit ?? fallback, isLive: hit !== undefined };
}

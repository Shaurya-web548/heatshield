"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ControlBar, { type PlayState } from "@/components/ControlBar";
import { TitleChip, BulletinCard } from "@/components/Overlays";
import { WarningBanners, AlertLog } from "@/components/Alerts";
import { cities, defaultCity } from "@/data/cities";
import {
  cityRisks,
  DAY_START,
  DAY_END,
  type RiskLevel,
  type ZoneRisk,
} from "@/lib/heat";
import { detectEscalations, alertBanners, type HeatAlert } from "@/lib/alerts";

// Leaflet touches `window` at module scope — it must never run during SSR.
const HeatMap = dynamic(() => import("@/components/HeatMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0b0a0f] text-neutral-500">
      Loading map…
    </div>
  ),
});

const PLAY_DURATION_MS = 10000; // 06:00 -> 20:00 in ~10 s
const BANNER_MS = 4000;
const DAY_SPAN = DAY_END - DAY_START;

// Ease-in-out so the choropleth warms and cools smoothly.
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function Home() {
  const [city, setCity] = useState(defaultCity);
  const [hour, setHour] = useState(DAY_START);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [selected, setSelected] = useState<ZoneRisk | null>(null);
  const rafRef = useRef<number | null>(null);
  const startProgressRef = useRef(0);

  const risks = useMemo(() => cityRisks(city, hour), [city, hour]);

  // ── Threshold alerts + banners ──────────────────────────────────────
  const [alerts, setAlerts] = useState<HeatAlert[]>([]);
  const [banners, setBanners] = useState<string[]>([]);
  const prevLevelsRef = useRef<Map<string, RiskLevel>>(new Map());
  // Dismiss timers live in a ref: effect cleanup must NOT cancel them, because
  // the alert effect re-runs on every animation frame while playing.
  const bannerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pushBanners = useCallback((texts: string[]) => {
    if (texts.length === 0) return;
    // Keep only the 3 most recent so a fast afternoon never stacks a wall.
    setBanners((old) =>
      [...old, ...texts.filter((b) => !old.includes(b))].slice(-3)
    );
    bannerTimersRef.current.push(
      setTimeout(() => {
        setBanners((old) => old.filter((b) => !texts.includes(b)));
      }, BANNER_MS)
    );
  }, []);
  useEffect(() => {
    const timers = bannerTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const fresh = detectEscalations(prevLevelsRef.current, risks, hour, alerts);
    prevLevelsRef.current = new Map(risks.map((r) => [r.zone.id, r.level]));
    if (fresh.length === 0) return;
    setAlerts((old) => [...old, ...fresh]);
    pushBanners(alertBanners(fresh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risks, hour, pushBanners]);

  const acknowledge = useCallback(
    (id: string) =>
      setAlerts((old) =>
        old.map((a) =>
          a.id === id ? { ...a, acknowledged: true, ackHour: hour } : a
        )
      ),
    [hour]
  );

  // ── Day playback ────────────────────────────────────────────────────
  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);
  useEffect(() => stopAnimation, [stopAnimation]);

  const startPlay = useCallback(
    (fromHour: number) => {
      stopAnimation();
      startProgressRef.current = (fromHour - DAY_START) / DAY_SPAN;
      setPlayState("playing");
      let startTs: number | null = null;
      const remaining = (1 - startProgressRef.current) * PLAY_DURATION_MS;
      const frame = (ts: number) => {
        if (startTs === null) startTs = ts;
        const t = remaining === 0 ? 1 : Math.min(1, (ts - startTs) / remaining);
        const linear =
          startProgressRef.current + (1 - startProgressRef.current) * t;
        const eased =
          startProgressRef.current === 0 ? easeInOutCubic(linear) : linear;
        setHour(Math.min(DAY_END, DAY_START + eased * DAY_SPAN));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          rafRef.current = null;
          setHour(DAY_END);
          setPlayState("done");
        }
      };
      rafRef.current = requestAnimationFrame(frame);
    },
    [stopAnimation]
  );

  const handlePlay = useCallback(() => {
    if (playState === "playing") {
      stopAnimation();
      setPlayState("idle");
      return;
    }
    const fromHour =
      playState === "done" || hour >= DAY_END ? DAY_START : hour;
    if (fromHour === DAY_START) {
      // A fresh day: clear yesterday's alerts so thresholds fire again.
      setAlerts([]);
      prevLevelsRef.current = new Map();
    }
    startPlay(fromHour);
  }, [playState, hour, stopAnimation, startPlay]);

  const handleScrub = useCallback(
    (h: number) => {
      stopAnimation();
      setPlayState(h >= DAY_END ? "done" : "idle");
      setHour(h);
    },
    [stopAnimation]
  );

  const handleCityChange = useCallback(
    (id: string) => {
      const next = cities.find((c) => c.id === id);
      if (!next) return;
      stopAnimation();
      setCity(next);
      setHour(DAY_START);
      setPlayState("idle");
      setSelected(null);
      setAlerts([]);
      setBanners([]);
      prevLevelsRef.current = new Map();
    },
    [stopAnimation]
  );

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0b0a0f]">
      {/* key remounts the map per city for a clean reset */}
      <HeatMap
        key={city.id}
        city={city}
        hour={hour}
        selectedZoneId={selected?.zone.id ?? null}
        onZoneClick={setSelected}
      />

      <div className="vignette z-[900]" />
      <div className="film-grain z-[901]" />

      <TitleChip city={city} onCityChange={handleCityChange} />
      <WarningBanners banners={banners} />

      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-3 sm:right-5 sm:top-5">
        <BulletinCard city={city} hour={hour} risks={risks} />
        <AlertLog alerts={alerts} onAck={acknowledge} />
      </div>

      <ControlBar
        hour={hour}
        playState={playState}
        onScrub={handleScrub}
        onPlay={handlePlay}
      />
    </main>
  );
}

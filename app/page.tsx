"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ControlBar, { type PlayState } from "@/components/ControlBar";
import { TitleChip, BulletinCard } from "@/components/Overlays";
import { WarningBanners, AlertLog } from "@/components/Alerts";
import {
  HotspotTable,
  ExplainCard,
  PointRiskCard,
} from "@/components/Dashboard";
import { AuthModal, ResponseConsole } from "@/components/Response";
import AdvisoryPanel from "@/components/AdvisoryPanel";
import type { MapFocus } from "@/components/HeatMap";
import {
  cities,
  defaultCity,
  COOLING_ICON,
  COOLING_LABEL,
} from "@/data/cities";
import type { LatLng } from "@/lib/geo";
import {
  cityRisks,
  pointRisk,
  formatHour,
  DAY_START,
  DAY_END,
  type RiskLevel,
  type ZoneRisk,
} from "@/lib/heat";
import { detectEscalations, alertBanners, type HeatAlert } from "@/lib/alerts";
import { generateAdvisory, nearestCooling } from "@/lib/advisories";
import {
  createTicket,
  advanceTicket,
  loadTickets,
  saveTickets,
  ticketsToCsv,
  MEASURES,
  type Measure,
  type Ticket,
} from "@/lib/response";

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

type LeftTab = "hotspots" | "response";

export default function Home() {
  const [city, setCity] = useState(defaultCity);
  const [hour, setHour] = useState(DAY_START);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [focus, setFocus] = useState<MapFocus>(null);
  const rafRef = useRef<number | null>(null);
  const startProgressRef = useRef(0);

  // Authority / response console
  const [officer, setOfficer] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("hotspots");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const isAuthority = officer !== null;

  useEffect(() => {
    const saved = sessionStorage.getItem("heatshield-officer");
    if (saved) setOfficer(saved);
  }, []);
  useEffect(() => {
    setTickets(loadTickets(city.id));
  }, [city.id]);
  useEffect(() => {
    saveTickets(city.id, tickets);
  }, [city.id, tickets]);

  const risks = useMemo(() => cityRisks(city, hour), [city, hour]);
  const selected = useMemo(
    () => risks.find((r) => r.zone.id === selectedId) ?? null,
    [risks, selectedId]
  );
  const pinRisk = useMemo(
    () => (pin ? pointRisk(city, pin, hour) : null),
    [city, pin, hour]
  );
  const pinCooling = useMemo(() => {
    if (!pin) return null;
    const n = nearestCooling(city, pin);
    return {
      name: n.point.name,
      label: COOLING_LABEL[n.point.kind],
      icon: COOLING_ICON[n.point.kind],
      distanceKm: n.distanceKm,
    };
  }, [city, pin]);

  // Advisory re-issued at every whole hour (typewriter re-runs on change).
  const wholeHour = Math.floor(hour);
  const advisory = useMemo(
    () => generateAdvisory(city, wholeHour, cityRisks(city, wholeHour)),
    [city, wholeHour]
  );

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

  // ── Response actions (authority only) ───────────────────────────────
  const dispatch = useCallback(
    (risk: ZoneRisk, measure: Measure) => {
      if (!officer) return;
      const t = createTicket(city.id, risk.zone, measure, hour, officer, alerts);
      setTickets((old) => [...old, t]);
      // Dispatching counts as acknowledging that zone's open alerts.
      setAlerts((old) =>
        old.map((a) =>
          a.zoneId === risk.zone.id && !a.acknowledged
            ? { ...a, acknowledged: true, ackHour: hour }
            : a
        )
      );
      pushBanners([
        `${MEASURES[measure].icon} ${MEASURES[measure].label} ticket opened for ${risk.zone.name} (${t.id})`,
      ]);
    },
    [officer, city.id, hour, alerts, pushBanners]
  );

  const advance = useCallback(
    (id: string) => {
      if (!officer) return;
      setTickets((old) =>
        old.map((t) => (t.id === id ? advanceTicket(t, hour, officer) : t))
      );
    },
    [officer, hour]
  );

  const exportCsv = useCallback(() => {
    const blob = new Blob([ticketsToCsv(tickets)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heatshield-${city.id}-response-log.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tickets, city.id]);

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
      setSelectedId(null);
      setPin(null);
      setFocus(null);
      setAlerts([]);
      setBanners([]);
      prevLevelsRef.current = new Map();
    },
    [stopAnimation]
  );

  const selectZone = useCallback((r: ZoneRisk, fly: boolean) => {
    setSelectedId(r.zone.id);
    setPin(null);
    if (fly)
      setFocus({ lat: r.zone.center.lat, lng: r.zone.center.lng, nonce: Date.now() });
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0b0a0f]">
      {/* key remounts the map per city for a clean reset */}
      <HeatMap
        key={city.id}
        city={city}
        hour={hour}
        selectedZoneId={selectedId}
        pinPoint={pin}
        focus={focus}
        onZoneClick={(r) => selectZone(r, false)}
        onMapClick={(p) => {
          setPin(p);
          setSelectedId(null);
        }}
      />

      <div className="vignette z-[900]" />
      <div className="film-grain z-[901]" />
      {isAuthority && (
        <>
          <div className="authority-frame z-[950]" />
          <div className="absolute left-1/2 top-0 z-[1050] -translate-x-1/2 rounded-b-lg border border-t-0 border-amber-400/40 bg-amber-950/80 px-4 py-1 text-[11px] font-bold tracking-widest text-amber-300 backdrop-blur-md">
            🛡️ MUNICIPAL RESPONSE MODE · {officer}
          </div>
        </>
      )}

      <TitleChip
        city={city}
        onCityChange={handleCityChange}
        isAuthority={isAuthority}
        onAuthority={() => {
          if (isAuthority) {
            sessionStorage.removeItem("heatshield-officer");
            setOfficer(null);
            setLeftTab("hotspots");
          } else {
            setAuthOpen(true);
          }
        }}
      />
      <WarningBanners banners={banners} />

      {/* Left panel: hotspot dashboard / response console */}
      <div className="absolute left-3 top-[78px] z-[1000] max-h-[calc(100vh-170px)] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border border-white/10 bg-black/70 p-3.5 shadow-xl backdrop-blur-md sm:left-5 sm:top-[86px]">
        {isAuthority && (
          <div className="mb-2.5 flex overflow-hidden rounded-lg border border-white/10 text-[11px]">
            {(["hotspots", "response"] as LeftTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setLeftTab(t)}
                className={`flex-1 py-1.5 font-semibold ${
                  leftTab === t
                    ? "bg-amber-500/25 text-amber-200"
                    : "text-neutral-400 hover:bg-white/10"
                }`}
              >
                {t === "hotspots" ? "🔥 Hotspots" : "🛡️ Response"}
              </button>
            ))}
          </div>
        )}
        {leftTab === "response" && isAuthority && officer ? (
          <ResponseConsole
            hour={hour}
            risks={risks}
            tickets={tickets}
            officer={officer}
            onDispatch={dispatch}
            onAdvance={advance}
            onExport={exportCsv}
            onReset={() => setTickets([])}
          />
        ) : (
          <>
            <HotspotTable
              risks={risks}
              hour={hour}
              selectedId={selectedId}
              onSelect={(r) => selectZone(r, true)}
            />
            {selected && (
              <ExplainCard risk={selected} onClose={() => setSelectedId(null)} />
            )}
            {!selected && (
              <div className="mt-2 text-[10px] text-neutral-500">
                Click a row or a zone for the factor breakdown · click anywhere
                on the map for the risk at that spot
              </div>
            )}
          </>
        )}
      </div>

      <div className="absolute right-3 top-3 z-[1000] flex max-h-[calc(100vh-110px)] flex-col items-end gap-3 overflow-y-auto sm:right-5 sm:top-5">
        <BulletinCard city={city} hour={hour} risks={risks} />
        <AlertLog alerts={alerts} onAck={acknowledge} />
        <AdvisoryPanel advisory={advisory} hourLabel={formatHour(wholeHour)} />
      </div>

      {pinRisk && pinCooling && (
        <PointRiskCard
          risk={pinRisk}
          cooling={pinCooling}
          onClose={() => setPin(null)}
        />
      )}

      <ControlBar
        hour={hour}
        playState={playState}
        onScrub={handleScrub}
        onPlay={handlePlay}
      />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(id) => {
          sessionStorage.setItem("heatshield-officer", id);
          setOfficer(id);
          setAuthOpen(false);
          setLeftTab("response");
        }}
      />
    </main>
  );
}

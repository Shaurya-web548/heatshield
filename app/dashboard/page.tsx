"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { TitleChip, BulletinCard } from "@/components/Overlays";
import { WarningBanners } from "@/components/Alerts";
import {
  HotspotTable,
  ExplainCard,
  PointRiskCard,
  ZoneTable,
} from "@/components/Dashboard";
import { AuthModal, ResponseConsole } from "@/components/Response";
import {
  SectionNav,
  HriSection,
  AlertsSection,
  ResidentResponse,
  type View,
} from "@/components/Sections";
import AdvisoryPanel from "@/components/AdvisoryPanel";
import { Enter, Switch } from "@/components/Motion";
import { useLiveAdvisory } from "@/lib/useLiveAdvisory";
import type { MapFocus } from "@/components/HeatMap";
import {
  cities,
  defaultCity,
  zoneDerived,
  COOLING_ICON,
  COOLING_LABEL,
} from "@/data/cities";
import type { LatLng } from "@/lib/geo";
import {
  cityRisks,
  pointRisk,
  formatHour,
  DEFAULT_PARAMS,
  type ZoneRisk,
} from "@/lib/heat";
import { recipientsFor, NOTIFY_LEVELS, type HeatAlert } from "@/lib/alerts";
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
import { loadHistory, recordHour, historyToCsv, clearHistory } from "@/lib/history";

// Leaflet touches `window` at module scope — it must never run during SSR.
const HeatMap = dynamic(() => import("@/components/HeatMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0b0a0f] text-neutral-500">
      Loading map…
    </div>
  ),
});

/** Observation time of the IMD snapshot (afternoon peak). */
const OBS_HOUR = 14.5;
const BANNER_MS = 4000;

function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const VIEW_IDS: View[] = ["hotspots", "hri", "alerts", "response"];

export default function DashboardPage() {
  const [city, setCity] = useState(defaultCity);
  const [view, setView] = useState<View>("hotspots");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [coach, setCoach] = useState(false);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [focus, setFocus] = useState<MapFocus>(null);
  const [myZoneId, setMyZoneId] = useState<string>(defaultCity.zones[0].id);

  // Authority / response console
  const [officer, setOfficer] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const isAuthority = officer !== null;

  useEffect(() => {
    const saved = sessionStorage.getItem("heatshield-officer");
    if (saved) setOfficer(saved);
  }, []);
  // Deep link: /dashboard?view=hri — read once on mount (no Suspense needed).
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view") as View | null;
    if (v && VIEW_IDS.includes(v)) setView(v);
    // One-time coach hint after the map fly-in.
    if (!sessionStorage.getItem("heatshield-coached")) {
      const show = setTimeout(() => setCoach(true), 2400);
      const hide = setTimeout(() => {
        setCoach(false);
        sessionStorage.setItem("heatshield-coached", "1");
      }, 8400);
      return () => {
        clearTimeout(show);
        clearTimeout(hide);
      };
    }
  }, []);
  useEffect(() => {
    setTickets(loadTickets(city.id));
  }, [city.id]);
  useEffect(() => {
    saveTickets(city.id, tickets);
  }, [city.id, tickets]);

  const hour = OBS_HOUR;
  const risks = useMemo(() => cityRisks(city, hour, DEFAULT_PARAMS), [city, hour]);
  const selected = useMemo(
    () => risks.find((r) => r.zone.id === selectedId) ?? null,
    [risks, selectedId]
  );
  const pinRisk = useMemo(
    () => (pin ? pointRisk(city, pin, hour, DEFAULT_PARAMS) : null),
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

  const generated = useMemo(
    () => generateAdvisory(city, hour, risks, DEFAULT_PARAMS),
    [city, hour, risks]
  );
  const { advisory, isLive } = useLiveAdvisory(
    city,
    Math.floor(hour),
    risks,
    DEFAULT_PARAMS,
    generated
  );

  // Storage: record this observation (last_updated_timestamp)
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();
  useEffect(() => {
    recordHour(city.id, Math.floor(hour), risks);
    setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour12: false }));
  }, [city.id, hour, risks]);

  // ── Threshold alerts: every zone currently in a notify band ──────────
  const [acks, setAcks] = useState<Record<string, number>>({});
  const alerts: HeatAlert[] = useMemo(
    () =>
      risks
        .filter((r) => NOTIFY_LEVELS.includes(r.level))
        .map((r) => {
          const id = `${r.zone.id}:${r.level}`;
          return {
            id,
            hour,
            zoneId: r.zone.id,
            zoneName: r.zone.name,
            level: r.level,
            hri: r.hri,
            recipients: recipientsFor(r, r.level),
            acknowledged: acks[id] !== undefined,
            ackHour: acks[id],
          };
        }),
    [risks, hour, acks]
  );

  const [banners, setBanners] = useState<string[]>([]);
  const pushBanner = useCallback((text: string) => {
    setBanners((old) => [...old.filter((b) => b !== text), text].slice(-3));
    setTimeout(() => setBanners((old) => old.filter((b) => b !== text)), BANNER_MS);
  }, []);

  const acknowledge = useCallback(
    (id: string) => setAcks((old) => ({ ...old, [id]: hour })),
    [hour]
  );

  // ── Response actions (authority only) ───────────────────────────────
  const dispatch = useCallback(
    (risk: ZoneRisk, measure: Measure) => {
      if (!officer) return;
      const t = createTicket(city.id, risk.zone, measure, hour, officer, alerts);
      setTickets((old) => [...old, t]);
      setAcks((old) => {
        const next = { ...old };
        alerts.filter((a) => a.zoneId === risk.zone.id).forEach((a) => (next[a.id] ??= hour));
        return next;
      });
      pushBanner(
        `${MEASURES[measure].icon} ${MEASURES[measure].label} ticket opened for ${risk.zone.name} (${t.id})`
      );
    },
    [officer, city.id, hour, alerts, pushBanner]
  );

  const advance = useCallback(
    (id: string, notes?: string) => {
      if (!officer) return;
      setTickets((old) =>
        old.map((t) => {
          if (t.id !== id) return t;
          const zoneLevel = risks.find((r) => r.zone.id === t.zoneId)?.level;
          return advanceTicket(t, hour, officer, { notes, zoneLevel });
        })
      );
    },
    [officer, hour, risks]
  );

  const exportTickets = useCallback(
    () => downloadCsv(`heatshield-${city.id}-response-log.csv`, ticketsToCsv(tickets)),
    [tickets, city.id]
  );
  const exportHistory = useCallback(
    () => downloadCsv(`heatshield-${city.id}-readings.csv`, historyToCsv(loadHistory(city.id))),
    [city.id]
  );
  const exportZoneTable = useCallback(() => {
    const header = [
      "zone_id", "zone_name", "ward_number", "hri", "risk_level", "air_temp_c",
      "feels_like_c", "land_surface_temp_c", "tree_cover_pct", "built_up_pct",
      "traffic_index", "outdoor_worker_density", "population", "population_density_km2",
      "avg_building_height_m", "informal_settlement_pct", "nearest_health_centre_km",
      "cooling_shelter_count", "water_point_count", "observed", "last_updated",
    ];
    const rows = risks.map((r) => {
      const d = zoneDerived(city, r.zone);
      const f = r.zone.factors;
      const s = r.zone.statics;
      return [
        r.zone.id, r.zone.name, s.wardNumber, r.hri, r.level, r.airTempC.toFixed(1),
        r.feelsLikeC.toFixed(1), r.lstC.toFixed(1), Math.round(f.treeCover * 100),
        Math.round(f.builtUp * 100), Math.round(f.traffic * 100), Math.round(f.workers * 100),
        r.zone.population, d.populationDensityPerKm2, s.avgBuildingHeightM,
        s.informalSettlementPct, s.nearestHealthCentreKm, d.coolingShelterCount,
        d.waterPointCount, formatHour(hour), new Date().toISOString(),
      ];
    });
    downloadCsv(`heatshield-${city.id}-zones.csv`, [header, ...rows].map((r) => r.join(",")).join("\n"));
  }, [city, risks, hour]);

  const handleCityChange = useCallback((id: string) => {
    const next = cities.find((c) => c.id === id);
    if (!next) return;
    setCity(next);
    setSelectedId(null);
    setPin(null);
    setFocus(null);
    setAcks({});
    setBanners([]);
    setMyZoneId(next.zones[0].id);
  }, []);

  const selectZone = useCallback((r: ZoneRisk, fly: boolean) => {
    setSelectedId(r.zone.id);
    setMyZoneId(r.zone.id);
    setPin(null);
    if (fly)
      setFocus({ lat: r.zone.center.lat, lng: r.zone.center.lng, nonce: Date.now() });
  }, []);

  const changeView = (v: View) => {
    setView(v);
    // Keep the URL deep-linkable without a router transition.
    const url = new URL(window.location.href);
    url.searchParams.set("view", v);
    window.history.replaceState(null, "", url.toString());
  };

  const [showTable, setShowTable] = useState(false);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0b0a0f]">
      <HeatMap
        key={city.id}
        city={city}
        hour={hour}
        params={DEFAULT_PARAMS}
        selectedZoneId={selectedId}
        hoveredZoneId={hoveredId}
        pinPoint={pin}
        focus={focus}
        onZoneClick={(r) => selectZone(r, false)}
        onZoneHover={setHoveredId}
        onMapClick={(p) => {
          setPin(p);
          setSelectedId(null);
          setMyZoneId(pointRisk(city, p, hour).nearest.id);
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
          } else {
            setAuthOpen(true);
          }
        }}
        homeHref="/"
      />
      <WarningBanners banners={banners} />

      {coach && (
        <div className="coach-hint pointer-events-none absolute left-1/2 top-[58%] z-[1020] -translate-x-1/2 rounded-xl border border-white/15 bg-black/80 px-4 py-2 text-xs text-neutral-200 shadow-2xl backdrop-blur-md">
          👆 Hover a zone to highlight it · click it for the factors behind its score ·
          click any street for the risk there
        </div>
      )}

      {/* Left panel: sections */}
      <Enter
        from="right"
        delay={0.2}
        className="absolute left-3 top-[284px] z-[1000] max-h-[calc(100vh-300px)] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border border-white/10 bg-black/70 p-3.5 shadow-xl backdrop-blur-md sm:top-[86px] sm:left-5 sm:w-[22rem] sm:max-h-[calc(100vh-110px)]"
      >
        <SectionNav view={view} onView={changeView} isAuthority={isAuthority} />
        <Switch id={`${view}-${showTable}`}>

        {view === "hotspots" && (
          <>
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setShowTable((v) => !v)}
                className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:bg-white/10"
              >
                {showTable ? "🔥 Ranking" : "📋 Zone table"}
              </button>
            </div>
            {showTable ? (
              <ZoneTable
                city={city}
                risks={risks}
                hour={hour}
                onSelect={(r) => {
                  selectZone(r, true);
                  setShowTable(false);
                }}
                onExport={exportZoneTable}
              />
            ) : (
              <>
                <HotspotTable
                  risks={risks}
                  hour={hour}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onSelect={(r) => selectZone(r, true)}
                  onHover={setHoveredId}
                />
                {selected && (
                  <ExplainCard risk={selected} onClose={() => setSelectedId(null)} />
                )}
                {!selected && (
                  <div className="mt-2 text-[10px] text-neutral-500">
                    Observation {formatHour(hour)} IST · click a row or a zone for the
                    factors beneath its score · click anywhere on the map for the risk
                    at that spot
                  </div>
                )}
              </>
            )}
          </>
        )}

        {view === "hri" && (
          <HriSection city={city} risks={risks} hour={hour} onSelect={(r) => selectZone(r, true)} />
        )}

        {view === "alerts" && (
          <AlertsSection alerts={alerts} onAck={acknowledge} isAuthority={isAuthority} />
        )}

        {view === "response" &&
          (isAuthority && officer ? (
            <>
              <ResponseConsole
                hour={hour}
                risks={risks}
                alerts={alerts}
                tickets={tickets}
                officer={officer}
                onDispatch={dispatch}
                onAdvance={advance}
                onExport={exportTickets}
                onExportHistory={exportHistory}
                onReset={() => {
                  setTickets([]);
                  clearHistory(city.id);
                }}
              />
              <div className="mt-3 border-t border-white/10 pt-3">
                <ResidentResponse
                  city={city}
                  risks={risks}
                  alerts={alerts}
                  tickets={tickets}
                  zoneId={myZoneId}
                  onZone={setMyZoneId}
                />
              </div>
            </>
          ) : (
            <>
              <ResidentResponse
                city={city}
                risks={risks}
                alerts={alerts}
                tickets={tickets}
                zoneId={myZoneId}
                onZone={setMyZoneId}
              />
              <button
                onClick={() => setAuthOpen(true)}
                className="mt-2.5 w-full rounded-lg border border-amber-400/40 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/15"
              >
                🛡️ Municipal officer? Sign in to dispatch relief
              </button>
            </>
          ))}
        </Switch>
      </Enter>

      <Enter
        from="left"
        delay={0.35}
        className="absolute right-3 top-[86px] z-[1010] flex max-w-[calc(100vw-1.5rem)] flex-row flex-wrap items-start justify-end gap-2 sm:top-5 sm:right-5 sm:z-[1000] sm:max-h-[calc(100vh-110px)] sm:max-w-none sm:flex-col sm:items-end sm:gap-3 sm:overflow-y-auto"
      >
        <BulletinCard city={city} hour={hour} risks={risks} lastUpdated={lastUpdated} />
        <AdvisoryPanel advisory={advisory} hourLabel={formatHour(hour)} liveDot={isLive} />
      </Enter>

      {pinRisk && pinCooling && (
        <PointRiskCard risk={pinRisk} cooling={pinCooling} onClose={() => setPin(null)} />
      )}

      <Link
        href="/"
        className="absolute bottom-3 right-3 z-[1000] rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-[11px] text-neutral-300 backdrop-blur-md hover:bg-white/10 sm:bottom-5 sm:right-5"
      >
        ← Home
      </Link>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(id) => {
          sessionStorage.setItem("heatshield-officer", id);
          setOfficer(id);
          setAuthOpen(false);
          changeView("response");
        }}
      />
    </main>
  );
}


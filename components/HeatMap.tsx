"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  type City,
  type CoolingKind,
  COOLING_ICON,
  COOLING_LABEL,
} from "@/data/cities";
import { hexagon, type LatLng } from "@/lib/geo";
import {
  cityRisks,
  LEVEL_COLORS,
  LEVEL_ORDER,
  DEFAULT_PARAMS,
  type RiskLevel,
  type SimParams,
  type ZoneRisk,
} from "@/lib/heat";

export type MapFocus = { lat: number; lng: number; nonce: number } | null;

const pinIcon = L.divIcon({
  className: "",
  html: '<div class="risk-pin">📍</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 24],
});

function zoneLabelIcon(name: string, hri: number, color: string, state: "" | "is-selected" | "is-hovered") {
  return L.divIcon({
    className: "",
    html: `<div class="zone-label ${state}"><span class="zone-name">${name}</span><span class="zone-hri" style="color:${color}">${hri}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const coolingIcons = new Map<CoolingKind, L.DivIcon>();
function coolingIcon(kind: CoolingKind) {
  let icon = coolingIcons.get(kind);
  if (!icon) {
    icon = L.divIcon({
      className: "",
      html: `<div class="cool-dot">${COOLING_ICON[kind]}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    coolingIcons.set(kind, icon);
  }
  return icon;
}

function ClickCatcher({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({
    click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

function FocusFly({ focus }: { focus: MapFocus }) {
  const map = useMap();
  const last = useRef(0);
  useEffect(() => {
    if (!focus || focus.nonce === last.current) return;
    last.current = focus.nonce;
    map.flyTo([focus.lat, focus.lng], 13, { duration: 1 });
  }, [map, focus]);
  return null;
}

function IntroFly({ target, zoom }: { target: [number, number]; zoom: number }) {
  const map = useMap();
  const flown = useRef(false);
  useEffect(() => {
    if (flown.current) return;
    flown.current = true;
    const t = setTimeout(() => map.flyTo(target, zoom, { duration: 1.8 }), 300);
    return () => clearTimeout(t);
  }, [map, target, zoom]);
  return null;
}

export default function HeatMap({
  city,
  hour,
  params = DEFAULT_PARAMS,
  selectedZoneId,
  hoveredZoneId,
  pinPoint,
  focus = null,
  onZoneClick,
  onZoneHover,
  onMapClick,
}: {
  city: City;
  hour: number;
  params?: SimParams;
  selectedZoneId?: string | null;
  hoveredZoneId?: string | null;
  pinPoint: LatLng | null;
  focus?: MapFocus;
  onZoneClick?: (risk: ZoneRisk) => void;
  onZoneHover?: (id: string | null) => void;
  onMapClick: (p: LatLng) => void;
}) {
  const risks = useMemo(() => cityRisks(city, hour, params), [city, hour, params]);
  const hexes = useMemo(
    () =>
      new Map(
        city.zones.map((z) => [
          z.id,
          hexagon(z.center, z.radiusKm).map(
            (p) => [p.lat, p.lng] as [number, number]
          ),
        ])
      ),
    [city]
  );

  // One-shot flash when a zone escalates a level (drives the CSS burst).
  const prevLevelRef = useRef<Map<string, RiskLevel>>(new Map());
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  const flashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const prev = prevLevelRef.current;
    const escalated: string[] = [];
    for (const r of risks) {
      const before = prev.get(r.zone.id);
      if (
        before !== undefined &&
        LEVEL_ORDER.indexOf(r.level) > LEVEL_ORDER.indexOf(before) &&
        (r.level === "HIGH" || r.level === "CRITICAL")
      )
        escalated.push(r.zone.id);
      prev.set(r.zone.id, r.level);
    }
    if (escalated.length === 0) return;
    setFlashing((old) => new Set([...old, ...escalated]));
    // Timer must survive effect re-runs (this effect fires every frame while playing).
    flashTimersRef.current.push(
      setTimeout(() => {
        setFlashing((old) => {
          const next = new Set(old);
          escalated.forEach((id) => next.delete(id));
          return next;
        });
      }, 1200)
    );
  }, [risks]);
  useEffect(() => {
    const timers = flashTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <MapContainer
      center={[city.center.lat, city.center.lng]}
      zoom={city.zoom - 2}
      zoomControl={false}
      attributionControl={true}
      className="h-full w-full"
      style={{ background: "#0b0a0f" }}
    >
      <IntroFly target={[city.center.lat, city.center.lng]} zoom={city.zoom} />
      <ClickCatcher onClick={onMapClick} />
      <FocusFly focus={focus} />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {risks.map((r) => {
        const color = LEVEL_COLORS[r.level];
        const selected = r.zone.id === selectedZoneId;
        const hovered = r.zone.id === hoveredZoneId;
        const cls = [
          r.level === "CRITICAL" && !selected ? "zone-critical" : "",
          selected ? "zone-selected" : "",
          flashing.has(r.zone.id) ? "zone-flash" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <Polygon
            key={`${r.zone.id}-${cls}`}
            positions={hexes.get(r.zone.id)!}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                onZoneClick?.(r);
              },
              mouseover: () => onZoneHover?.(r.zone.id),
              mouseout: () => onZoneHover?.(null),
            }}
            pathOptions={{
              color: selected || hovered ? "#ffffff" : color,
              weight: selected ? 2.5 : hovered ? 2 : 1.5,
              opacity: 0.9,
              fillColor: color,
              // hotter = more opaque, so the choropleth "ignites" through the day
              fillOpacity: (hovered ? 0.22 : 0.12) + (r.hri / 100) * 0.5,
              className: cls || undefined,
            }}
          >
            <Tooltip sticky>
              <span className="font-semibold">{r.zone.name}</span> — HRI{" "}
              {r.hri} · {r.level} · feels like {r.feelsLikeC.toFixed(0)} °C
            </Tooltip>
          </Polygon>
        );
      })}

      {/* Zone labels: name + HRI, styled like the landing page */}
      {risks.map((r) => (
        <Marker
          key={`label-${r.zone.id}`}
          position={[r.zone.center.lat, r.zone.center.lng]}
          icon={zoneLabelIcon(
            r.zone.name.replace(/ \(.*\)$/, ""),
            r.hri,
            LEVEL_COLORS[r.level],
            r.zone.id === selectedZoneId ? "is-selected" : r.zone.id === hoveredZoneId ? "is-hovered" : ""
          )}
          interactive={false}
          zIndexOffset={700}
        />
      ))}

      {/* Cooling points: water kiosks, shade, ORS, cooling centres */}
      {city.coolingPoints.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={coolingIcon(p.kind)}
          zIndexOffset={600}
          eventHandlers={{ click: (e) => L.DomEvent.stopPropagation(e) }}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            {COOLING_ICON[p.kind]} {p.name} · {COOLING_LABEL[p.kind]}
          </Tooltip>
        </Marker>
      ))}

      {pinPoint && (
        <Marker
          position={[pinPoint.lat, pinPoint.lng]}
          icon={pinIcon}
          zIndexOffset={1200}
          interactive={false}
        />
      )}
    </MapContainer>
  );
}

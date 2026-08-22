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
  type RiskLevel,
  type ZoneRisk,
} from "@/lib/heat";

export type MapFocus = { lat: number; lng: number; nonce: number } | null;

const pinIcon = L.divIcon({
  className: "",
  html: '<div class="risk-pin">📍</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 24],
});

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

export default function HeatMap({
  city,
  hour,
  selectedZoneId,
  pinPoint,
  focus = null,
  onZoneClick,
  onMapClick,
}: {
  city: City;
  hour: number;
  selectedZoneId?: string | null;
  pinPoint: LatLng | null;
  focus?: MapFocus;
  onZoneClick?: (risk: ZoneRisk) => void;
  onMapClick: (p: LatLng) => void;
}) {
  const risks = useMemo(() => cityRisks(city, hour), [city, hour]);
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
        (r.level === "ALERT" || r.level === "CRITICAL")
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
      zoom={city.zoom}
      zoomControl={false}
      attributionControl={true}
      className="h-full w-full"
      style={{ background: "#0b0a0f" }}
    >
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
        const cls = [
          r.level === "CRITICAL" ? "zone-critical" : "",
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
            }}
            pathOptions={{
              color: selected ? "#ffffff" : color,
              weight: selected ? 2.5 : 1.5,
              opacity: 0.9,
              fillColor: color,
              // hotter = more opaque, so the choropleth "ignites" through the day
              fillOpacity: 0.12 + (r.hri / 100) * 0.5,
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

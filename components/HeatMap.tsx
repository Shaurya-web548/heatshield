"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { PIN_SVG, COOLING_SVG } from "@/components/ClassicIcons";

export type MapFocus = { lat: number; lng: number; nonce: number } | null;

/** Breathing room between two labels, and how far off-screen one still counts. */
const LABEL_GAP = 5;
const LABEL_MARGIN = 120;

const pinIcon = L.divIcon({
  className: "",
  html: `<div class="risk-pin">${PIN_SVG}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 24],
});

/** A label is drawn in full, cut down to the bare HRI number, or dropped. */
type LabelMode = "full" | "compact";

function zoneLabelIcon(
  name: string,
  hri: number,
  color: string,
  state: "" | "is-selected" | "is-hovered",
  mode: LabelMode
) {
  const nameHtml = mode === "full" ? `<span class="zone-name">${name}</span>` : "";
  return L.divIcon({
    className: "",
    html: `<div class="zone-label ${state}">${nameHtml}<span class="zone-hri" style="color:${color}">${hri}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const shortName = (name: string) => name.replace(/ \(.*\)$/, "");

/** Text width for the collision maths, measured once per (size, string). */
const widthCache = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, fontPx: number) {
  const key = `${fontPx}|${text}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (measureCtx) measureCtx.font = `700 ${fontPx}px "Playfair Display", Georgia, serif`;
  // The extra term is the 0.04em letter-spacing; 0.62em/char is the fallback
  // when no canvas context is available.
  const width = measureCtx
    ? measureCtx.measureText(text).width + text.length * fontPx * 0.04
    : text.length * fontPx * 0.62;
  widthCache.set(key, width);
  return width;
}

const COOLING_ICON_NAMES: Record<CoolingKind, string> = {
  water: "Droplet",
  shade: "Umbrella",
  ors: "Salt",
  centre: "Snowflake",
};

const coolingIcons = new Map<CoolingKind, L.DivIcon>();
function coolingIcon(kind: CoolingKind) {
  let icon = coolingIcons.get(kind);
  if (!icon) {
    icon = L.divIcon({
      className: "",
      html: `<div class="cool-dot">${COOLING_SVG[kind]}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    coolingIcons.set(kind, icon);
  }
  return icon;
}

/**
 * Zone labels (name + HRI), decluttered: at low zooms the boxes collide, so the
 * lower-ranked label drops its name — and if even the number will not fit, the
 * label is skipped. Selected / hovered zones always win the space.
 */
function ZoneLabels({
  risks,
  selectedZoneId,
  hoveredZoneId,
}: {
  risks: ZoneRisk[];
  selectedZoneId?: string | null;
  hoveredZoneId?: string | null;
}) {
  const map = useMap();
  const [modes, setModes] = useState<Map<string, LabelMode>>(new Map());

  const declutter = useCallback(() => {
    const phone = window.matchMedia("(max-width: 639px)").matches;
    const nameFont = phone ? 8 : 11;
    const hriFont = phone ? 14 : 20;
    const fullHeight = nameFont + 6 + hriFont + 3;
    const size = map.getSize();
    const rank = (id: string) => (id === selectedZoneId ? 0 : id === hoveredZoneId ? 1 : 2);
    // risks arrive sorted by HRI, so ties keep the hotter zone in front.
    const ordered = risks
      .map((risk, index) => ({ risk, index }))
      .sort((a, b) => rank(a.risk.zone.id) - rank(b.risk.zone.id) || a.index - b.index);

    const placed: [number, number, number, number][] = [];
    const fits = (box: [number, number, number, number]) =>
      placed.every(([x0, y0, x1, y1]) => box[0] > x1 || box[2] < x0 || box[1] > y1 || box[3] < y0);

    const next = new Map<string, LabelMode>();
    for (const { risk } of ordered) {
      const p = map.latLngToContainerPoint([risk.zone.center.lat, risk.zone.center.lng]);
      const offscreen =
        p.x < -LABEL_MARGIN ||
        p.y < -LABEL_MARGIN ||
        p.x > size.x + LABEL_MARGIN ||
        p.y > size.y + LABEL_MARGIN;
      if (offscreen) continue;
      const box = (w: number, h: number): [number, number, number, number] => [
        p.x - w / 2 - LABEL_GAP,
        p.y - 4,
        p.x + w / 2 + LABEL_GAP,
        p.y - 4 + h + LABEL_GAP,
      ];
      const full = box(
        Math.max(textWidth(shortName(risk.zone.name).toUpperCase(), nameFont), hriFont * 1.6),
        fullHeight
      );
      if (fits(full)) {
        next.set(risk.zone.id, "full");
        placed.push(full);
        continue;
      }
      const compact = box(textWidth(String(risk.hri), hriFont), hriFont + 3);
      if (fits(compact)) {
        next.set(risk.zone.id, "compact");
        placed.push(compact);
      }
    }
    setModes(next);
  }, [map, risks, selectedZoneId, hoveredZoneId]);

  // Panning keeps the labels in the same relative positions; only zoom, resize
  // and the fly-ins (which end in moveend) can change what collides.
  useMapEvents({ zoomend: declutter, moveend: declutter, resize: declutter });
  useEffect(declutter, [declutter]);

  return (
    <>
      {risks.map((r) => {
        const mode = modes.get(r.zone.id);
        if (!mode) return null;
        return (
          <Marker
            key={`label-${r.zone.id}`}
            position={[r.zone.center.lat, r.zone.center.lng]}
            icon={zoneLabelIcon(
              shortName(r.zone.name),
              r.hri,
              LEVEL_COLORS[r.level],
              r.zone.id === selectedZoneId
                ? "is-selected"
                : r.zone.id === hoveredZoneId
                  ? "is-hovered"
                  : "",
              mode
            )}
            interactive={false}
            zIndexOffset={700}
          />
        );
      })}
    </>
  );
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

/** Ripple effect on zone or map click */
function ClickRipple({ onClick }: { onClick: (p: LatLng) => void }) {
  const map = useMap();
  useMapEvents({
    click: (e) => {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      // Add a ripple DOM element at the click point
      const container = map.getContainer();
      const point = map.latLngToContainerPoint(e.latlng);
      const ripple = document.createElement("div");
      ripple.className = "map-ripple";
      ripple.style.left = `${point.x}px`;
      ripple.style.top = `${point.y}px`;
      ripple.style.zIndex = "470";
      container.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);
    },
  });
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
      <ClickRipple onClick={onMapClick} />
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
              <span className="font-heading font-semibold">{r.zone.name}</span> — HRI{" "}
              {r.hri} · {r.level} · feels like {r.feelsLikeC.toFixed(0)} °C
            </Tooltip>
          </Polygon>
        );
      })}

      {/* Zone labels: name + HRI, styled like the landing page */}
      <ZoneLabels
        risks={risks}
        selectedZoneId={selectedZoneId}
        hoveredZoneId={hoveredZoneId}
      />

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
            <span className="font-heading">{COOLING_ICON_NAMES[p.kind]}</span> · {p.name} · {COOLING_LABEL[p.kind]}
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

"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { City } from "@/data/cities";
import { hexagon } from "@/lib/geo";
import { cityRisks, LEVEL_COLORS, type ZoneRisk } from "@/lib/heat";

export default function HeatMap({
  city,
  hour,
  onZoneClick,
  selectedZoneId,
}: {
  city: City;
  hour: number;
  onZoneClick?: (risk: ZoneRisk) => void;
  selectedZoneId?: string | null;
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

  return (
    <MapContainer
      center={[city.center.lat, city.center.lng]}
      zoom={city.zoom}
      zoomControl={false}
      attributionControl={true}
      className="h-full w-full"
      style={{ background: "#0b0a0f" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {risks.map((r) => {
        const color = LEVEL_COLORS[r.level];
        const selected = r.zone.id === selectedZoneId;
        return (
          <Polygon
            key={r.zone.id}
            positions={hexes.get(r.zone.id)!}
            eventHandlers={{ click: () => onZoneClick?.(r) }}
            pathOptions={{
              color: selected ? "#ffffff" : color,
              weight: selected ? 2.5 : 1.5,
              opacity: 0.9,
              fillColor: color,
              // hotter = more opaque, so the choropleth "ignites" through the day
              fillOpacity: 0.12 + (r.hri / 100) * 0.5,
              className: r.level === "CRITICAL" ? "zone-critical" : undefined,
            }}
          >
            <Tooltip sticky>
              <span className="font-semibold">{r.zone.name}</span> — HRI{" "}
              {r.hri} · {r.level} · feels like {r.feelsLikeC.toFixed(0)} °C
            </Tooltip>
          </Polygon>
        );
      })}
    </MapContainer>
  );
}

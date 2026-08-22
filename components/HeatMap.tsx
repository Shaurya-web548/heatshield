"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { City } from "@/data/cities";

export default function HeatMap({ city }: { city: City }) {
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
    </MapContainer>
  );
}

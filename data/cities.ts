// Snapshot data — IMD-style bulletin values and representative urban factors.
// Everything is hardcoded: the demo never depends on a live feed.

export type City = {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
};

export const cities: City[] = [
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    center: { lat: 23.03, lng: 72.58 },
    zoom: 12,
  },
  {
    id: "delhi",
    name: "Delhi",
    center: { lat: 28.63, lng: 77.22 },
    zoom: 11,
  },
];

export const defaultCity = cities[0];

// Small spherical-geometry helpers — no external geo libraries.

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export type LatLng = { lat: number; lng: number };

/** Point reached by travelling `km` from (lat, lng) along `bearingDeg`. */
export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  km: number
): LatLng {
  const delta = km / EARTH_RADIUS_KM;
  const theta = toRad(bearingDeg);
  const phi1 = toRad(lat);
  const lambda1 = toRad(lng);
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) +
      Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
    );
  return { lat: toDeg(phi2), lng: toDeg(lambda2) };
}

/** Great-circle distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dPhi = toRad(b.lat - a.lat);
  const dLambda = toRad(b.lng - a.lng);
  const h =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Hexagonal cell around a centre — a representative "ward" footprint. */
export function hexagon(center: LatLng, radiusKm: number): LatLng[] {
  return Array.from({ length: 6 }, (_, i) =>
    destinationPoint(center.lat, center.lng, 30 + i * 60, radiusKm)
  );
}

// Shared distance math. Haversine is precise enough for "how far is this
// worker" display purposes — no PostGIS/routing dependency needed for v1.

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

// MapLibre has no built-in Circle component (unlike react-native-maps) — draw
// one as a GeoJSON polygon instead, rendered via <GeoJSONSource><Layer .../>.
export function createCircleGeoJSON(
  center: { latitude: number; longitude: number },
  radiusMeters: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const earthRadius = 6371000;
  const latRad = (center.latitude * Math.PI) / 180;

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusMeters * Math.cos(angle)) / (earthRadius * Math.cos(latRad));
    const dy = (radiusMeters * Math.sin(angle)) / earthRadius;
    const lng = center.longitude + (dx * 180) / Math.PI;
    const lat = center.latitude + (dy * 180) / Math.PI;
    coords.push([lng, lat]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

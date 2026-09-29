const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Standard geohash encoder (used for the location.geohash proximity index). */
export function geohash(lat: number, lng: number, precision = 7): string {
  let hash = "";
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  const latRange: [number, number] = [-90, 90];
  const lngRange: [number, number] = [-180, 180];
  while (hash.length < precision) {
    const range = evenBit ? lngRange : latRange;
    const value = evenBit ? lng : lat;
    const mid = (range[0] + range[1]) / 2;
    if (value >= mid) {
      idx = idx * 2 + 1;
      range[0] = mid;
    } else {
      idx = idx * 2;
      range[1] = mid;
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      hash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

/** Great-circle distance in metres. */
export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Approximate lat/lng bounding box around a point. */
export function boundingBox(lat: number, lng: number, radiusM: number) {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

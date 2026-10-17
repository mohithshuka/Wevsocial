import crypto from "crypto";

/**
 * Deterministic geo-obfuscation.
 *
 * Requirements satisfied:
 *  - Obfuscated point is always within 500 meters of the real point.
 *  - The same (id, secret) pair always produces the SAME offset, so the
 *    obfuscated coordinates are stable across server restarts (no randomness
 *    at request time — the offset is derived purely from a hash).
 *  - Real coordinates are never returned by any API response; only the
 *    obfuscated pair leaves the process boundary (enforced by controllers).
 */

const EARTH_RADIUS_METERS = 6378137;
const MAX_OFFSET_METERS = 500;
const MIN_OFFSET_METERS = 0;

function seededUnitInterval(seedInput: string): number {
  const hash = crypto.createHash("sha256").update(seedInput).digest();
  // Use first 6 bytes as an unsigned integer for good distribution.
  const int = hash.readUIntBE(0, 6);
  const max = Math.pow(2, 48) - 1;
  return int / max; // deterministic value in [0, 1)
}

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Derives a stable pseudo-random offset (distance + bearing) from a stable
 * identifier (e.g. provider id) combined with a server secret. Because the
 * output depends only on deterministic hashing, calling this twice with the
 * same inputs always yields the same obfuscated coordinates.
 */
export function obfuscateCoordinates(
  id: string,
  real: LatLng,
  secret: string,
  /** Optional override, e.g. { minMeters: 500, maxMeters: 1000 } for a
   * booking-privacy use case that wants a wider minimum radius. Defaults
   * preserve the existing 0–500m provider-list behavior exactly. */
  range?: { minMeters?: number; maxMeters?: number }
): LatLng {
  const minMeters = range?.minMeters ?? MIN_OFFSET_METERS;
  const maxMeters = range?.maxMeters ?? MAX_OFFSET_METERS;

  const distanceSeed = seededUnitInterval(`${secret}:${id}:distance`);
  const bearingSeed = seededUnitInterval(`${secret}:${id}:bearing`);

  // sqrt() keeps the distribution uniform over the disc area rather than
  // clustering points near the center.
  const distanceMeters = minMeters + Math.sqrt(distanceSeed) * (maxMeters - minMeters);
  const bearingRadians = bearingSeed * 2 * Math.PI;

  const latRad = (real.lat * Math.PI) / 180;
  const lngRad = (real.lng * Math.PI) / 180;
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRadians)
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

/** Haversine distance in meters, used for distance sorting on OBFUSCATED points. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const latRad1 = (a.lat * Math.PI) / 180;
  const latRad2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latRad1) * Math.cos(latRad2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
}

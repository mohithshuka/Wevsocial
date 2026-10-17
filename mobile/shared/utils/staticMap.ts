import { Platform } from "react-native";

/**
 * Optional. If set, static map previews use the Google Static Maps API
 * (crisper tiles, matches the rest of a Google Maps-based UX). If unset,
 * previews fall back to a free, no-key OpenStreetMap static image service
 * so the feature works out of the box with zero setup.
 *
 * Set in mobile/.env:
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-key-here
 */
const GOOGLE_STATIC_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface StaticMapOptions {
  zoom?: number;
  width?: number;
  height?: number;
}

/**
 * Builds a static map preview image URL centered on (lat, lng). Used for
 * BOTH the blurred/approximate state and the exact state — the caller
 * controls blurring visually (see MapPreview), not by requesting a
 * different image. This keeps the two states visually consistent (same
 * zoom, same framing) so the transition reads as "revealing detail", not
 * as loading an unrelated image.
 */
export function buildStaticMapUrl(
  lat: number,
  lng: number,
  opts: StaticMapOptions = {}
): string {
  const zoom = opts.zoom ?? 15;
  const width = Math.round(opts.width ?? 640);
  const height = Math.round(opts.height ?? 320);

  if (GOOGLE_STATIC_MAPS_KEY) {
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: String(zoom),
      size: `${width}x${height}`,
      maptype: "roadmap",
      scale: "2",
      key: GOOGLE_STATIC_MAPS_KEY,
    });
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }

  // No-key fallback (OpenStreetMap tiles). Fine for dev/demo; add
  // EXPO_PUBLIC_GOOGLE_MAPS_API_KEY for production-quality tiles.
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    maptype: "mapnik",
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}

/** Opens the location in the Google Maps app (or maps.google.com if not installed). */
export function googleMapsViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Opens turn-by-turn-ready directions to the location. */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

/**
 * Android exposes a dedicated navigation intent scheme that drops the user
 * straight into turn-by-turn guidance. iOS has no equivalent deep link
 * without registering a custom URL scheme query allowlist at build time,
 * so it reuses the directions link there (still opens Maps pre-loaded and
 * ready to start navigation with one more tap).
 */
export function googleMapsNavigationUrl(lat: number, lng: number): string {
  if (Platform.OS === "android") {
    return `google.navigation:q=${lat},${lng}`;
  }
  return googleMapsDirectionsUrl(lat, lng);
}

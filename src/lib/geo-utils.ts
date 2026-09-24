/**
 * Geospatial validation and normalization utilities.
 */

export interface StandardLatLng {
  lat: number;
  lng: number;
}

export interface StandardLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt?: string;
}

/**
 * Validates whether a value is a valid { lat: number, lng: number } coordinate pair.
 * Checks for:
 * - Object with lat and lng
 * - Numeric types and finite values (no NaN or Infinity)
 * - Strict world geographic bounds: -90 <= lat <= 90 and -180 <= lng <= 180
 */
export function isValidLatLng(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== 'object') return false;

  const { lat, lng } = value as { lat?: unknown; lng?: unknown };

  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Normalizes any coordinate representation into { lat, lng } or null.
 * Handles:
 * - GeoJSON Point: { type: 'Point', coordinates: [longitude, latitude] }
 * - Object with { lat, lng }
 * - Object with { latitude, longitude }
 * - Coercible valid numeric strings
 * Returns null if missing, null, undefined, or invalid.
 */
export function parseLatLng(input: unknown): StandardLocation | null {
  if (!input || typeof input !== 'object') return null;

  const obj = input as Record<string, any>;

  // Case 1: GeoJSON Point format: { type: 'Point', coordinates: [lng, lat] }
  if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
    const [lngRaw, latRaw] = obj.coordinates;
    const lat = typeof latRaw === 'number' ? latRaw : parseFloat(latRaw);
    const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(lngRaw);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return {
        lat,
        lng,
        accuracy: typeof obj.accuracy === 'number' ? obj.accuracy : undefined,
        updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
      };
    }
    return null;
  }

  // Case 2: Standard { lat, lng } format
  if ('lat' in obj && 'lng' in obj) {
    const lat = typeof obj.lat === 'number' ? obj.lat : parseFloat(obj.lat);
    const lng = typeof obj.lng === 'number' ? obj.lng : parseFloat(obj.lng);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return {
        lat,
        lng,
        accuracy: typeof obj.accuracy === 'number' ? obj.accuracy : undefined,
        updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
      };
    }
    return null;
  }

  // Case 3: Alternate { latitude, longitude } format
  if ('latitude' in obj && 'longitude' in obj) {
    const lat = typeof obj.latitude === 'number' ? obj.latitude : parseFloat(obj.latitude);
    const lng = typeof obj.longitude === 'number' ? obj.longitude : parseFloat(obj.longitude);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return {
        lat,
        lng,
        accuracy: typeof obj.accuracy === 'number' ? obj.accuracy : undefined,
        updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
      };
    }
    return null;
  }

  return null;
}

export interface GeocodingResult {
  name: string;
  displayName: string;
  coordinates: [number, number]; // [lng, lat]
}

/**
 * Fetch places using Nominatim API (OpenStreetMap).
 * This is a public API, subject to rate limits.
 * @param query search text
 * @returns Array of results
 */
export async function searchPlaces(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) return [];
  
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
    
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      coordinates: [parseFloat(item.lon), parseFloat(item.lat)]
    }));
  } catch (error) {
    console.warn("Failed to fetch places", error);
    return [];
  }
}

export interface NearbyHelpResult {
  id: string;
  name: string;
  category: string;
  phone?: string;
  address?: string;
  distance?: number;
  lat: number;
  lon: number;
}

/**
 * Fetch nearby help using internal server-side API (which safely calls Overpass)
 * @param lat Latitude
 * @param lon Longitude
 * @param radius Search radius in meters
 * @param signal Optional AbortSignal for request cancellation
 */
export async function findNearbyHelp(lat: number, lon: number, radius = 3000, signal?: AbortSignal): Promise<NearbyHelpResult[]> {
  try {
    const url = `/api/nearby?lat=${lat}&lng=${lon}&radius=${radius}`;
    console.log(`[DEV-LOG] Searching Server API with coordinates: lat=${lat}, lon=${lon}`);
    
    const response = await fetch(url, { signal });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`[DEV-LOG] Nearby API failed. URL: ${url}, Status: ${response.status} ${response.statusText}, Body: ${responseText}`);
      throw new Error(
        `Nearby API failed: ${response.status} ${response.statusText} — ${responseText}`
      );
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse Nearby API response as JSON: ${responseText}`);
    }
    
    return data.results || [];
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn("Nearby help request aborted.");
      throw error;
    }
    console.warn("Failed to find nearby help", error);
    throw error;
  }
}

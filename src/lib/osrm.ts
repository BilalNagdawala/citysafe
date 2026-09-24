export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat]
}

export interface Route {
  id: string;
  name?: "Fastest" | "Balanced" | "Safer" | string;
  geometry: GeoJSONLineString;
  distance: number; // meters
  duration: number; // seconds
  weight_name?: string;
  weight?: number;
  origin?: [number, number];
  destination?: [number, number];
  isAvoidanceRoute?: boolean;
}

export interface OSRMResponse {
  code: string;
  routes: Route[];
  waypoints: any[];
}

/**
 * Fetch routes from OSRM API.
 * @param origin [lng, lat]
 * @param destination [lng, lat]
 * @param alternatives boolean | number | string
 * @returns Array of routes
 */
export async function getRoutes(
  origin: [number, number],
  destination: [number, number],
  alternatives: boolean | number | string = true
): Promise<Route[]> {
  try {
    const altParam = typeof alternatives === "boolean" 
      ? (alternatives ? "true" : "false") 
      : String(alternatives);
    const url = `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson&alternatives=${altParam}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API Error: ${response.statusText}`);
    }
    const data: OSRMResponse = await response.json();
    if (data.code !== "Ok") {
      throw new Error(`OSRM API Error Code: ${data.code}`);
    }
    return (data.routes || []).map((r, idx) => ({
      ...r,
      id: r.id || `osrm-${idx}-${Math.round(r.duration)}-${Math.round(r.distance)}`,
      origin,
      destination,
    }));
  } catch (error) {
    console.warn("Failed to fetch routes", error);
    return [];
  }
}

/**
 * Checks if two routes have meaningfully distinct geometries, durations, or distances.
 */
function isDistinctRoute(r1: Route, r2: Route): boolean {
  const durDiff = Math.abs(r1.duration - r2.duration);
  const distDiff = Math.abs(r1.distance - r2.distance);
  // At least 15 seconds difference or 100 meters difference
  return durDiff > 15 || distDiff > 100;
}

/**
 * Fetches candidate routes from OSRM, including proactive detour routes that navigate
 * around active incident zones if any candidate crosses them.
 * Never fabricates coordinates or duplicates existing routes.
 */
export async function getThreeDistinctRoutes(
  origin: [number, number],
  destination: [number, number],
  activeIncidents: Array<{ lat: number; lng: number; severity: number; category?: string }> = [],
  targetTime: Date = new Date()
): Promise<Route[]> {
  const distinctRoutes: Route[] = [];

  // 1. Direct OSRM request with multiple alternatives
  const directRoutes = await getRoutes(origin, destination, 3);
  for (const r of directRoutes) {
    if (!distinctRoutes.some(existing => !isDistinctRoute(existing, r))) {
      distinctRoutes.push({
        ...r,
        id: `route-direct-${distinctRoutes.length}-${Math.round(r.duration)}`,
        origin,
        destination,
      });
    }
    if (distinctRoutes.length >= 3) break;
  }

  const dLng = destination[0] - origin[0];
  const dLat = destination[1] - origin[1];
  const len = Math.sqrt(dLng * dLng + dLat * dLat);

  // 2. Incident-Aware Avoidance Detours
  // If active incidents exist along the corridor, generate waypoints specifically placed
  // outside the incident risk radius to produce genuine avoidance routes snapped to roads
  if (activeIncidents.length > 0 && len > 0.001) {
    const perpLng = -dLat / len;
    const perpLat = dLng / len;
    const fastestDuration = distinctRoutes[0]?.duration || 0;

    // Filter incidents with high or critical severity (severity >= 60)
    const severeIncidents = activeIncidents.filter(inc => (inc.severity || 50) >= 60);

    for (const inc of severeIncidents) {
      // Check if incident is within corridor bounding box + padding
      const minLng = Math.min(origin[0], destination[0]) - 0.02;
      const maxLng = Math.max(origin[0], destination[0]) + 0.02;
      const minLat = Math.min(origin[1], destination[1]) - 0.02;
      const maxLat = Math.max(origin[1], destination[1]) + 0.02;

      if (inc.lng >= minLng && inc.lng <= maxLng && inc.lat >= minLat && inc.lat <= maxLat) {
        // Compute avoidance radius in degrees (~0.007 for ~750m)
        const avoidanceOffsetDeg = Math.max(0.006, ((inc.severity || 50) / 100) * 0.009);

        // Try both sides of the corridor around the incident
        const detourOffsets = [avoidanceOffsetDeg, -avoidanceOffsetDeg, avoidanceOffsetDeg * 1.5, -avoidanceOffsetDeg * 1.5];

        for (const offset of detourOffsets) {
          const wpLng = inc.lng + perpLng * offset;
          const wpLat = inc.lat + perpLat * offset;

          try {
            const wpUrl = `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${wpLng.toFixed(6)},${wpLat.toFixed(6)};${destination[0]},${destination[1]}?overview=full&geometries=geojson`;
            const res = await fetch(wpUrl);
            if (res.ok) {
              const data: OSRMResponse = await res.json();
              if (data.code === "Ok" && data.routes && data.routes[0]) {
                const r = data.routes[0];
                const maxAcceptableDur = fastestDuration > 0 ? fastestDuration * 2.5 : Infinity;
                if (r.duration <= maxAcceptableDur) {
                  if (!distinctRoutes.some(existing => !isDistinctRoute(existing, r))) {
                    distinctRoutes.push({
                      ...r,
                      id: `route-avoidance-${distinctRoutes.length}-${Math.round(r.duration)}`,
                      origin,
                      destination,
                      isAvoidanceRoute: true,
                    });
                  }
                }
              }
            }
          } catch {
            // Ignore individual detour errors
          }
        }
      }
    }
  }

  // 3. Fallback corridor-offset waypoints if fewer than 3 distinct routes were returned
  if (distinctRoutes.length < 3 && len > 0.001) {
    const perpLng = -dLat / len;
    const perpLat = dLng / len;
    const midLng = (origin[0] + destination[0]) / 2;
    const midLat = (origin[1] + destination[1]) / 2;

    const offsetMultipliers = [0.22, -0.22, 0.40, -0.40, 0.60, -0.60];
    const fastestDuration = distinctRoutes[0]?.duration || 0;

    for (const mult of offsetMultipliers) {
      if (distinctRoutes.length >= 3) break;

      const wpLng = midLng + perpLng * (mult * len);
      const wpLat = midLat + perpLat * (mult * len);

      try {
        const wpUrl = `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${wpLng.toFixed(6)},${wpLat.toFixed(6)};${destination[0]},${destination[1]}?overview=full&geometries=geojson`;
        const res = await fetch(wpUrl);
        if (res.ok) {
          const data: OSRMResponse = await res.json();
          if (data.code === "Ok" && data.routes && data.routes[0]) {
            const r = data.routes[0];
            const maxAcceptableDur = fastestDuration > 0 ? fastestDuration * 2.5 : Infinity;
            if (r.duration <= maxAcceptableDur) {
              if (!distinctRoutes.some(existing => !isDistinctRoute(existing, r))) {
                distinctRoutes.push({
                  ...r,
                  id: `route-corridor-${distinctRoutes.length}-${Math.round(r.duration)}`,
                  origin,
                  destination,
                });
              }
            }
          }
        }
      } catch {
        // Ignore individual waypoint fetch errors
      }
    }
  }

  return distinctRoutes;
}

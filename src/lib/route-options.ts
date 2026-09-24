import { Route } from "./osrm";
import { calculateSafetyScore, RouteScore } from "./safety";

export type RouteCategory = "Fastest" | "Balanced" | "Safer";

export interface CategorizedRoute extends Route {
  category: RouteCategory;
  formattedDuration: string;
  formattedDistance: string;
  safetyScore: number;
  scoreData: RouteScore;
  crossesActiveIncident: boolean;
  incidentNotice: string;
  noCompleteAvoidance?: boolean;
}

export function formatDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}

export function formatDistance(meters: number): string {
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}

function getIncidentNotice(scoreData: RouteScore): { crossesActiveIncident: boolean; incidentNotice: string } {
  const summary = scoreData.intersectionSummary;
  if (!summary || summary.totalZonesCrossed === 0) {
    return {
      crossesActiveIncident: false,
      incidentNotice: "This route avoids all active high-risk incident zones."
    };
  }

  const count = summary.totalZonesCrossed;
  return {
    crossesActiveIncident: true,
    incidentNotice: `This route crosses ${count} active incident zone${count > 1 ? "s" : ""}.`
  };
}

/**
 * Categorizes candidate routes into "Fastest", "Balanced", and "Safer",
 * enforcing that Safer routes actively avoid critical/high-severity incident zones
 * whenever an alternative route exists.
 */
export function categorizeThreeRoutes(
  routes: Route[],
  targetTime: Date,
  incidents: any[] = [],
  venues: any[] = []
): CategorizedRoute[] {
  if (!routes || routes.length === 0) {
    return [];
  }

  // 1. Score every candidate route using the real-time scoring engine
  const scoredRoutes = routes.map((route, idx) => {
    const scoreData = calculateSafetyScore(route, idx, targetTime, incidents, venues);
    const { crossesActiveIncident, incidentNotice } = getIncidentNotice(scoreData);
    return {
      ...route,
      safetyScore: scoreData.safetyScore,
      scoreData,
      crossesActiveIncident,
      incidentNotice,
      formattedDuration: formatDuration(route.duration),
      formattedDistance: formatDistance(route.distance)
    };
  });

  // 2. Single route scenario
  if (scoredRoutes.length === 1) {
    const single = scoredRoutes[0];
    return [{
      ...single,
      category: "Fastest",
      name: "Fastest"
    }];
  }

  // 3. Two routes scenario
  if (scoredRoutes.length === 2) {
    const sortedByDuration = [...scoredRoutes].sort((a, b) => a.duration - b.duration);
    const fastest = sortedByDuration[0];
    const second = sortedByDuration[1];

    const secondCategory: RouteCategory = 
      second.safetyScore >= fastest.safetyScore || !second.crossesActiveIncident 
        ? "Safer" 
        : "Balanced";

    return [
      { ...fastest, category: "Fastest", name: "Fastest" },
      { ...second, category: secondCategory, name: secondCategory }
    ];
  }

  // 4. Three or more routes: categorize into Fastest, Balanced, and Safer
  // Fastest: Prioritizes minimum travel duration
  const sortedByDuration = [...scoredRoutes].sort((a, b) => a.duration - b.duration);
  const fastest = sortedByDuration[0];

  const remaining = sortedByDuration.filter(r => r.id !== fastest.id);

  // Check if any remaining routes completely avoid incident zones
  const avoidingRoutes = remaining.filter(r => !r.crossesActiveIncident);
  let safer: (typeof scoredRoutes)[0];
  let balanced: (typeof scoredRoutes)[0];
  let noCompleteAvoidance = false;

  if (avoidingRoutes.length > 0) {
    // If an avoiding route exists, Safer MUST come from the avoiding routes
    // Pick the avoiding route with highest safety score
    avoidingRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
    safer = avoidingRoutes[0];

    // Balanced is chosen from the remaining pool
    const otherCandidates = remaining.filter(r => r.id !== safer.id);
    if (otherCandidates.length > 0) {
      // Prefer an avoiding route if another exists, otherwise balance duration & safety
      otherCandidates.sort((a, b) => {
        if (!a.crossesActiveIncident && b.crossesActiveIncident) return -1;
        if (a.crossesActiveIncident && !b.crossesActiveIncident) return 1;
        return a.duration - b.duration;
      });
      balanced = otherCandidates[0];
    } else {
      balanced = remaining[0];
    }
  } else {
    // No remaining route completely avoids incident zones
    // Check if fastest avoided incidents
    if (!fastest.crossesActiveIncident) {
      // Fastest was already clean, so pick remaining based on safety and duration
      remaining.sort((a, b) => b.safetyScore - a.safetyScore);
      safer = remaining[0];
      balanced = remaining[1] || remaining[0];
    } else {
      // ALL available routes cross incident risk zones
      noCompleteAvoidance = true;
      // Sort remaining by least incident exposure (fewest zones crossed, then least meters, then score)
      remaining.sort((a, b) => {
        const sumA = a.scoreData.intersectionSummary;
        const sumB = b.scoreData.intersectionSummary;
        if (sumA.totalZonesCrossed !== sumB.totalZonesCrossed) {
          return sumA.totalZonesCrossed - sumB.totalZonesCrossed;
        }
        if (sumA.totalMetersInRiskZones !== sumB.totalMetersInRiskZones) {
          return sumA.totalMetersInRiskZones - sumB.totalMetersInRiskZones;
        }
        return b.safetyScore - a.safetyScore;
      });

      safer = remaining[0];
      balanced = remaining[1] || remaining[0];
    }
  }

  const result: CategorizedRoute[] = [
    {
      ...fastest,
      category: "Fastest",
      name: "Fastest",
      noCompleteAvoidance: noCompleteAvoidance && fastest.crossesActiveIncident
    },
    {
      ...balanced,
      category: "Balanced",
      name: "Balanced",
      noCompleteAvoidance: noCompleteAvoidance && balanced.crossesActiveIncident
    },
    {
      ...safer,
      category: "Safer",
      name: "Safer",
      noCompleteAvoidance: noCompleteAvoidance && safer.crossesActiveIncident
    }
  ];

  return result;
}

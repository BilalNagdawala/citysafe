import { Route } from "./osrm";

export type RiskLevel = "LOW" | "MODERATE" | "ELEVATED";
export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface SafetyFactor {
  reason: string;
  scoreImpact: number;
  type: "positive" | "negative" | "neutral";
}

export interface ScoreBreakdownItem {
  label: string;
  impact: number;
  type: "base" | "positive" | "negative" | "neutral";
}

export interface IncidentData {
  id: string;
  category: string;
  severity: number;
  lat: number;
  lng: number;
  confidence: number;
  occurredAt?: string;
  createdAt?: string;
  timestamp?: string;
  status?: string;
}

export interface IncidentRiskZone {
  id: string;
  category: string;
  severity: number;
  severityLevel: SeverityLevel;
  center: [number, number]; // [lng, lat]
  radiusMeters: number;
  occurredAt?: string;
  recencyFactor: number;
  timeOfDayFactor: number;
  effectiveRiskWeight: number;
  nightPenalty: number;
  dayPenalty: number;
}

export interface IncidentIntersection {
  incidentId: string;
  category: string;
  severity: number;
  severityLevel: SeverityLevel;
  center: [number, number];
  radiusMeters: number;
  metersInsideZone: number;
  isIntersected: boolean;
  closestDistanceMeters: number;
  intersectionPoint?: [number, number];
  recencyFactor: number;
  scorePenalty: number;
}

export interface RouteIntersectionSummary {
  intersections: IncidentIntersection[];
  totalZonesCrossed: number;
  totalMetersInRiskZones: number;
  crossedCriticalZone: boolean;
  crossedHighZone: boolean;
  highestSeverityCrossed: SeverityLevel | "NONE";
  avoidanceStatus: "AVOIDS_ALL" | "CROSSES_INCIDENTS";
  statusText: string;
}

export interface DangerZone {
  center: [number, number]; // lng, lat
  radius: number; // roughly in degrees (0.005 ~ 500m)
  radiusMeters: number;
  nightPenalty: number;
  dayPenalty: number;
  name: string;
  severityLevel: SeverityLevel;
  isIntersected?: boolean;
}

export interface RouteScore {
  routeIndex: number;
  safetyScore: number; // 0-100
  riskLevel: RiskLevel;
  explanations: string[];
  factors: SafetyFactor[];
  scoreBreakdown: ScoreBreakdownItem[];
  dangerZones: DangerZone[];
  intersectionSummary: RouteIntersectionSummary;
}

// Pseudo-random hash for deterministic lighting/activity scores based on coordinates
function pseudoHash(lng: number, lat: number): number {
  const str = `${lng.toFixed(4)},${lat.toFixed(4)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) / 2147483647;
}

/**
 * Calculates Haversine distance in meters between two [lng, lat] points
 */
export function haversineDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371000;
  const lat1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[1] * Math.PI) / 180;
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Maps a numeric severity score (1-100) to a formal SeverityLevel
 */
export function getSeverityLevel(severity: number): SeverityLevel {
  if (severity >= 85) return "CRITICAL";
  if (severity >= 65) return "HIGH";
  if (severity >= 40) return "MEDIUM";
  return "LOW";
}

/**
 * Computes configured geographic risk radius in meters based on severity and category
 * Rules:
 * - Critical incident: 500–800 metres (650m base)
 * - High severity: 300–500 metres (450m base)
 * - Medium severity: 200–350 metres (300m base)
 * - Low severity: 100–200 metres (150m base)
 */
export function getIncidentRiskRadius(severity: number, category: string): number {
  const level = getSeverityLevel(severity);
  let baseRadius = 300;

  switch (level) {
    case "CRITICAL":
      baseRadius = 650;
      break;
    case "HIGH":
      baseRadius = 450;
      break;
    case "MEDIUM":
      baseRadius = 300;
      break;
    case "LOW":
      baseRadius = 150;
      break;
  }

  // Category radius adjustments for high-impact physical threats
  const catLower = category.toLowerCase();
  if (catLower.includes("weapon") || catLower.includes("assault") || catLower.includes("riot")) {
    baseRadius += 100;
  } else if (catLower.includes("harassment") || catLower.includes("theft") || catLower.includes("robbery")) {
    baseRadius += 50;
  }

  return baseRadius;
}

/**
 * Calculates time-aware incident recency and cyclical time-of-day relevance
 */
export function calculateTimeRelevance(
  occurredAtStr: string | undefined,
  targetTime: Date
): {
  recencyFactor: number;
  timeOfDayFactor: number;
  compositeWeight: number;
} {
  if (!occurredAtStr) {
    return { recencyFactor: 0.8, timeOfDayFactor: 0.9, compositeWeight: 0.72 };
  }

  const occurredAt = new Date(occurredAtStr);
  const diffHours = (targetTime.getTime() - occurredAt.getTime()) / (1000 * 60 * 60);

  // If incident timestamp is significantly in the future, it hasn't occurred
  if (diffHours < -1) {
    return { recencyFactor: 0.05, timeOfDayFactor: 0.5, compositeWeight: 0.02 };
  }

  // Recency decay:
  // 0 - 6 hours: 1.0 (fresh/active)
  // 6 - 24 hours: 0.85
  // 1 - 3 days: 0.60
  // 3 - 7 days: 0.35
  // > 7 days: 0.15 (historical warning)
  let recencyFactor = 1.0;
  if (diffHours > 168) recencyFactor = 0.15;
  else if (diffHours > 72) recencyFactor = 0.35;
  else if (diffHours > 24) recencyFactor = 0.60;
  else if (diffHours > 6) recencyFactor = 0.85;

  // Time-of-day cyclical alignment (night incident vs night journey)
  const incHour = occurredAt.getHours();
  const targetHour = targetTime.getHours();
  const hourDiff = Math.abs(incHour - targetHour);
  const circHourDiff = Math.min(hourDiff, 24 - hourDiff); // 0 to 12
  const timeOfDayFactor = Math.round((1.0 - (circHourDiff / 12) * 0.4) * 100) / 100;

  const compositeWeight = Math.round(recencyFactor * timeOfDayFactor * 100) / 100;

  return { recencyFactor, timeOfDayFactor, compositeWeight };
}

/**
 * Converts incident data into formal geographic risk zones with time-aware radii and penalties
 */
export function createIncidentRiskZones(
  incidents: IncidentData[],
  targetTime: Date
): IncidentRiskZone[] {
  return incidents.map(inc => {
    const timeIso = inc.occurredAt || inc.createdAt || inc.timestamp;
    const { recencyFactor, timeOfDayFactor, compositeWeight } = calculateTimeRelevance(timeIso, targetTime);
    const severityLevel = getSeverityLevel(inc.severity);
    const baseRadius = getIncidentRiskRadius(inc.severity, inc.category);
    
    // Effective radius scales slightly with recency (stale reports have a smaller zone of immediate danger)
    const radiusMeters = Math.round(baseRadius * Math.max(0.65, recencyFactor));
    const effectiveRiskWeight = Math.round(inc.severity * compositeWeight);

    // Compute day and night penalties
    const confidenceMultiplier = Math.max(0.4, (inc.confidence || 70) / 100);
    const nightPenalty = Math.max(
      5,
      Math.round((effectiveRiskWeight * 0.45 * confidenceMultiplier))
    );
    const dayPenalty = Math.max(
      3,
      Math.round((effectiveRiskWeight * 0.25 * confidenceMultiplier))
    );

    return {
      id: inc.id,
      category: inc.category,
      severity: inc.severity,
      severityLevel,
      center: [inc.lng, inc.lat],
      radiusMeters,
      occurredAt: timeIso,
      recencyFactor,
      timeOfDayFactor,
      effectiveRiskWeight,
      nightPenalty,
      dayPenalty,
    };
  });
}

/**
 * Checks route geometry against active incident zones.
 * Calculates exact distance traveled inside each zone and highest severity crossed.
 */
export function checkRouteIncidentIntersections(
  coords: [number, number][],
  riskZones: IncidentRiskZone[],
  isDark: boolean
): RouteIntersectionSummary {
  if (!coords || coords.length < 2 || !riskZones || riskZones.length === 0) {
    return {
      intersections: [],
      totalZonesCrossed: 0,
      totalMetersInRiskZones: 0,
      crossedCriticalZone: false,
      crossedHighZone: false,
      highestSeverityCrossed: "NONE",
      avoidanceStatus: "AVOIDS_ALL",
      statusText: "This route avoids all active high-risk incident zones.",
    };
  }

  const intersections: IncidentIntersection[] = [];
  let totalMetersInRiskZones = 0;
  let crossedCriticalZone = false;
  let crossedHighZone = false;

  for (const zone of riskZones) {
    let metersInsideZone = 0;
    let closestDistanceMeters = Infinity;
    let intersectionPoint: [number, number] | undefined = undefined;

    // Convert zone center to reference point
    const cLng = zone.center[0];
    const cLat = zone.center[1];
    const cosLat = Math.cos((cLat * Math.PI) / 180);

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];

      // Local planar projection in meters relative to zone center
      const x1 = (p1[0] - cLng) * cosLat * 111320;
      const y1 = (p1[1] - cLat) * 110540;
      const x2 = (p2[0] - cLng) * cosLat * 111320;
      const y2 = (p2[1] - cLat) * 110540;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (segLen === 0) {
        const d = Math.sqrt(x1 * x1 + y1 * y1);
        if (d < closestDistanceMeters) closestDistanceMeters = d;
        continue;
      }

      // Projection factor t of center (0,0) on segment p1->p2
      const t = -(x1 * dx + y1 * dy) / (segLen * segLen);
      const tClamped = Math.max(0, Math.min(1, t));
      const px = x1 + tClamped * dx;
      const py = y1 + tClamped * dy;
      const dPoint = Math.sqrt(px * px + py * py);

      if (dPoint < closestDistanceMeters) {
        closestDistanceMeters = dPoint;
        if (dPoint < zone.radiusMeters && !intersectionPoint) {
          intersectionPoint = [
            cLng + px / (cosLat * 111320),
            cLat + py / 110540,
          ];
        }
      }

      // Intersection interval of segment with circle of radius R
      // |P(t)|^2 <= R^2  => a*t^2 + b*t + c <= 0
      const a = segLen * segLen;
      const b = 2 * (x1 * dx + y1 * dy);
      const c = x1 * x1 + y1 * y1 - zone.radiusMeters * zone.radiusMeters;
      const disc = b * b - 4 * a * c;

      if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);

        const tStart = Math.max(0, Math.min(t1, t2));
        const tEnd = Math.min(1, Math.max(t1, t2));

        if (tStart < tEnd) {
          metersInsideZone += (tEnd - tStart) * segLen;
        }
      }
    }

    const isIntersected = metersInsideZone > 10 || closestDistanceMeters < zone.radiusMeters;
    metersInsideZone = Math.round(metersInsideZone);

    if (isIntersected) {
      totalMetersInRiskZones += metersInsideZone;
      if (zone.severityLevel === "CRITICAL") crossedCriticalZone = true;
      if (zone.severityLevel === "HIGH") crossedHighZone = true;
    }

    const basePenalty = isDark ? zone.nightPenalty : zone.dayPenalty;
    // Traversal penalty scales with distance traveled inside the zone
    const traversalBoost = metersInsideZone > 50 ? Math.min(15, Math.round(metersInsideZone / 60)) : 0;
    const scorePenalty = isIntersected ? basePenalty + traversalBoost : 0;

    intersections.push({
      incidentId: zone.id,
      category: zone.category,
      severity: zone.severity,
      severityLevel: zone.severityLevel,
      center: zone.center,
      radiusMeters: zone.radiusMeters,
      metersInsideZone,
      isIntersected,
      closestDistanceMeters: Math.round(closestDistanceMeters),
      intersectionPoint,
      recencyFactor: zone.recencyFactor,
      scorePenalty,
    });
  }

  const crossedIntersections = intersections.filter(i => i.isIntersected);
  const totalZonesCrossed = crossedIntersections.length;

  let highestSeverityCrossed: SeverityLevel | "NONE" = "NONE";
  if (crossedCriticalZone) highestSeverityCrossed = "CRITICAL";
  else if (crossedHighZone) highestSeverityCrossed = "HIGH";
  else if (crossedIntersections.some(i => i.severityLevel === "MEDIUM")) highestSeverityCrossed = "MEDIUM";
  else if (crossedIntersections.some(i => i.severityLevel === "LOW")) highestSeverityCrossed = "LOW";

  const avoidanceStatus = totalZonesCrossed === 0 ? "AVOIDS_ALL" : "CROSSES_INCIDENTS";
  const statusText =
    totalZonesCrossed === 0
      ? "This route avoids all active high-risk incident zones."
      : `This route crosses ${totalZonesCrossed} active incident zone${totalZonesCrossed > 1 ? "s" : ""}.`;

  return {
    intersections,
    totalZonesCrossed,
    totalMetersInRiskZones: Math.round(totalMetersInRiskZones),
    crossedCriticalZone,
    crossedHighZone,
    highestSeverityCrossed,
    avoidanceStatus,
    statusText,
  };
}

/**
 * Calculates safety score with explainable score breakdown and exact incident risk zone intersections.
 */
export function calculateSafetyScore(
  route: Route,
  routeIndex: number,
  targetTime: Date,
  incidents: IncidentData[] = [],
  venues: any[] = []
): RouteScore {
  const baseScore = 90;
  let score = baseScore;
  const explanations: string[] = [];
  const factors: SafetyFactor[] = [];
  const scoreBreakdown: ScoreBreakdownItem[] = [
    { label: "Base route score", impact: baseScore, type: "base" }
  ];

  const hourOfDay = targetTime.getHours();
  const isEarlyMorning = hourOfDay >= 4 && hourOfDay < 7;
  const isDaytime = hourOfDay >= 7 && hourOfDay < 17;
  const isEvening = hourOfDay >= 17 && hourOfDay < 20;
  const isLateEvening = hourOfDay >= 20 && hourOfDay < 23;
  const isNight = hourOfDay >= 23 || hourOfDay < 4;
  const isDark = hourOfDay >= 18 || hourOfDay < 6;
  const timeStr = targetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // 1. Time of Day Impact
  if (isNight) {
    score -= 12;
    factors.push({ reason: `At ${timeStr}: Late night hours (isolated)`, scoreImpact: -12, type: "negative" });
    scoreBreakdown.push({ label: `Late night travel (${timeStr})`, impact: -12, type: "negative" });
  } else if (isLateEvening) {
    score -= 6;
    factors.push({ reason: `At ${timeStr}: Late evening hours`, scoreImpact: -6, type: "negative" });
    scoreBreakdown.push({ label: `Late evening travel (${timeStr})`, impact: -6, type: "negative" });
  } else if (isEvening) {
    score -= 2;
    factors.push({ reason: `At ${timeStr}: Evening twilight`, scoreImpact: -2, type: "negative" });
    scoreBreakdown.push({ label: `Evening twilight (${timeStr})`, impact: -2, type: "negative" });
  } else if (isEarlyMorning) {
    score -= 4;
    factors.push({ reason: `At ${timeStr}: Early morning (low activity)`, scoreImpact: -4, type: "negative" });
    scoreBreakdown.push({ label: `Early morning travel (${timeStr})`, impact: -4, type: "negative" });
  } else {
    score += 5;
    factors.push({ reason: `At ${timeStr}: Daytime (high visibility)`, scoreImpact: +5, type: "positive" });
    scoreBreakdown.push({ label: "Daytime visibility", impact: +5, type: "positive" });
  }

  // 2. Incident Risk Zones & Intersections
  const riskZones = createIncidentRiskZones(incidents, targetTime);
  const intersectionSummary = checkRouteIncidentIntersections(route.geometry.coordinates, riskZones, isDark);

  for (const intersection of intersectionSummary.intersections) {
    if (intersection.isIntersected) {
      score -= intersection.scorePenalty;
      const zoneLabel = `${intersection.category} (${intersection.severityLevel.toLowerCase()})`;
      explanations.push(`⚠ Route passes through active ${zoneLabel} zone`);
      factors.push({
        reason: `Incident: ${zoneLabel} (${intersection.metersInsideZone}m in zone)`,
        scoreImpact: -intersection.scorePenalty,
        type: "negative",
      });
      scoreBreakdown.push({
        label: `Active ${zoneLabel} zone (${intersection.metersInsideZone}m)`,
        impact: -intersection.scorePenalty,
        type: "negative",
      });
    }
  }

  if (intersectionSummary.totalZonesCrossed === 0 && riskZones.length > 0) {
    score += 4;
    factors.push({ reason: "Avoids all active high-risk incident zones", scoreImpact: +4, type: "positive" });
    scoreBreakdown.push({ label: "Clear of active incident zones", impact: +4, type: "positive" });
    explanations.push("✓ Route avoids all active risk zones");
  }

  // 3. Environmental Lighting and Pedestrian Density (deterministic hash)
  const coords = route.geometry.coordinates;
  const step = Math.max(1, Math.floor(coords.length / 40));
  let poorLightingCount = 0;
  let isolatedCount = 0;

  for (let i = 0; i < coords.length; i += step) {
    const [lng, lat] = coords[i];
    const envHash = pseudoHash(lng, lat);
    if (envHash < 0.22) poorLightingCount++;
    if (envHash > 0.78) isolatedCount++;
  }

  if (poorLightingCount > 2 && isDark) {
    score -= 8;
    factors.push({ reason: `At ${timeStr}: Low street lighting on segments`, scoreImpact: -8, type: "negative" });
    scoreBreakdown.push({ label: "Low street lighting", impact: -8, type: "negative" });
  } else if (isDark) {
    score += 4;
    factors.push({ reason: `At ${timeStr}: Good main road illumination`, scoreImpact: +4, type: "positive" });
    scoreBreakdown.push({ label: "Good street illumination", impact: +4, type: "positive" });
  }

  if (isolatedCount > 2) {
    score -= 6;
    factors.push({ reason: "Low activity / isolated corridor", scoreImpact: -6, type: "negative" });
    scoreBreakdown.push({ label: "Low pedestrian activity", impact: -6, type: "negative" });
  } else {
    score += 5;
    factors.push({ reason: "High pedestrian and commercial activity", scoreImpact: +5, type: "positive" });
    scoreBreakdown.push({ label: "Active commercial corridor", impact: +5, type: "positive" });
  }

  // 4. Proximity to Late-Night Alcohol / Nightclub Venues
  if ((isLateEvening || isNight) && venues.length > 0) {
    let alcoholVenueCount = 0;
    for (const venue of venues) {
      if (venue.category === "bar" || venue.category === "night_club") {
        for (let i = 0; i < coords.length; i += step) {
          const dist = haversineDistanceMeters(coords[i], [venue.lon, venue.lat]);
          if (dist < 250) {
            alcoholVenueCount++;
            break;
          }
        }
      }
    }

    if (alcoholVenueCount > 0) {
      const penalty = Math.min(6, alcoholVenueCount * 2);
      score -= penalty;
      factors.push({ reason: "Proximity to late-night venues", scoreImpact: -penalty, type: "negative" });
      scoreBreakdown.push({ label: "Proximity to nightlife venues", impact: -penalty, type: "negative" });
    }
  }

  // 5. Proximity to Police / Hospital Assistance
  if (venues.length > 0) {
    let assistanceNear = false;
    for (const venue of venues) {
      if (venue.category === "police" || venue.category === "hospital") {
        for (let i = 0; i < coords.length; i += step) {
          const dist = haversineDistanceMeters(coords[i], [venue.lon, venue.lat]);
          if (dist < 400) {
            assistanceNear = true;
            break;
          }
        }
      }
      if (assistanceNear) break;
    }

    if (assistanceNear) {
      score += 6;
      factors.push({ reason: "Proximity to emergency assistance / police", scoreImpact: +6, type: "positive" });
      scoreBreakdown.push({ label: "Nearby police / emergency station", impact: +6, type: "positive" });
      explanations.push("✓ Rapid access to emergency assistance");
    }
  }

  // Cap score to [15, 100]
  score = Math.max(15, Math.min(100, Math.round(score)));

  let riskLevel: RiskLevel = "LOW";
  if (score < 50 || intersectionSummary.crossedCriticalZone) {
    riskLevel = "ELEVATED";
  } else if (score < 75 || intersectionSummary.crossedHighZone) {
    riskLevel = "MODERATE";
  }

  // Create DangerZone objects for Map overlay
  const dangerZones: DangerZone[] = riskZones.map(rz => ({
    name: rz.category,
    center: rz.center,
    radius: rz.radiusMeters / 111000,
    radiusMeters: rz.radiusMeters,
    nightPenalty: rz.nightPenalty,
    dayPenalty: rz.dayPenalty,
    severityLevel: rz.severityLevel,
    isIntersected: intersectionSummary.intersections.some(i => i.incidentId === rz.id && i.isIntersected),
  }));

  // Deduplicate factors and explanations
  const uniqueFactorsMap = new Map<string, SafetyFactor>();
  factors.forEach(f => uniqueFactorsMap.set(f.reason, f));
  const finalFactors = Array.from(uniqueFactorsMap.values());

  const finalExplanations = Array.from(new Set(explanations));
  if (finalExplanations.length === 0) {
    if (score >= 75) finalExplanations.push("✓ Safe conditions across route corridor");
    else finalExplanations.push("⚠ Moderate cautions advised along path");
  }

  return {
    routeIndex,
    safetyScore: score,
    riskLevel,
    explanations: finalExplanations,
    factors: finalFactors,
    scoreBreakdown,
    dangerZones,
    intersectionSummary,
  };
}

export interface AreaScore {
  safetyScore: number;
  riskLevel: RiskLevel;
  factors: SafetyFactor[];
}

export function calculateAreaSafetyScore(
  lat: number,
  lng: number,
  targetTime: Date,
  incidents: IncidentData[] = [],
  venues: any[] = []
): AreaScore {
  let score = 95;
  let factors: SafetyFactor[] = [];
  
  const hourOfDay = targetTime.getHours();
  const isEarlyMorning = hourOfDay >= 4 && hourOfDay < 7;
  const isDaytime = hourOfDay >= 7 && hourOfDay < 17;
  const isEvening = hourOfDay >= 17 && hourOfDay < 20;
  const isLateEvening = hourOfDay >= 20 && hourOfDay < 23;
  const isNight = hourOfDay >= 23 || hourOfDay < 4;
  const isDark = hourOfDay >= 18 || hourOfDay < 6;
  const timeStr = targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isNight) {
    score -= 12;
    factors.push({ reason: `At ${timeStr}: Late night hours`, scoreImpact: -12, type: 'negative' });
  } else if (isLateEvening) {
    score -= 6;
    factors.push({ reason: `At ${timeStr}: Late evening hours`, scoreImpact: -6, type: 'negative' });
  } else if (isEvening) {
    score -= 2;
    factors.push({ reason: `At ${timeStr}: Evening (twilight)`, scoreImpact: -2, type: 'negative' });
  } else if (isEarlyMorning) {
    score -= 4;
    factors.push({ reason: `At ${timeStr}: Early morning (low activity)`, scoreImpact: -4, type: 'negative' });
  } else {
    factors.push({ reason: `At ${timeStr}: Daytime visibility`, scoreImpact: +5, type: 'positive' });
  }

  // Check incidents proximity using accurate Haversine distance
  let incidentPenalty = 0;
  for (const inc of incidents) {
    const dist = haversineDistanceMeters([lng, lat], [inc.lng, inc.lat]);
    const radius = getIncidentRiskRadius(inc.severity, inc.category);
    if (dist < radius) {
      const penalty = isDark ? Math.floor(inc.severity * 0.45) : Math.floor(inc.severity * 0.25);
      incidentPenalty += penalty;
      factors.push({ reason: `Recent ${inc.category.toLowerCase()} reported nearby`, scoreImpact: -penalty, type: 'negative' });
    }
  }
  
  if (incidentPenalty > 0) {
    score -= incidentPenalty;
    factors.push({ reason: `Recent incidents are frequent in this time window`, scoreImpact: 0, type: 'neutral' });
  } else {
    factors.push({ reason: "No recent incidents in this time window", scoreImpact: +5, type: 'positive' });
  }

  // Environmental
  const envHash = pseudoHash(lng, lat);
  if (envHash < 0.22 && isDark) {
    score -= 10;
    factors.push({ reason: "Poor street lighting detected", scoreImpact: -10, type: 'negative' });
  } else if (envHash >= 0.22 && isDark) {
    factors.push({ reason: "Good lighting remains", scoreImpact: +10, type: 'positive' });
  }
  
  if (envHash > 0.78) {
    score -= 8;
    factors.push({ reason: "Low activity / isolated area", scoreImpact: -8, type: 'negative' });
  } else {
    factors.push({ reason: "High pedestrian activity", scoreImpact: +8, type: 'positive' });
  }

  // Alcohol venue proximity penalty
  if ((isLateEvening || isNight) && venues.length > 0) {
    let alcoholVenueCount = 0;
    for (const venue of venues) {
      if (venue.category === 'bar' || venue.category === 'night_club') {
        const dist = haversineDistanceMeters([lng, lat], [venue.lon, venue.lat]);
        if (dist < 300) {
          alcoholVenueCount++;
        }
      }
    }
    
    if (alcoholVenueCount > 0) {
      const penalty = Math.min(6, alcoholVenueCount * 2);
      score -= penalty;
      factors.push({ reason: "Proximity to late-night venues", scoreImpact: -penalty, type: 'negative' });
    }
  }

  score = Math.max(15, Math.min(100, Math.floor(score)));

  let riskLevel: RiskLevel = "LOW";
  if (score < 50) riskLevel = "ELEVATED";
  else if (score < 75) riskLevel = "MODERATE";

  const uniqueFactors = new Map<string, SafetyFactor>();
  factors.forEach(f => uniqueFactors.set(f.reason, f));
  factors = Array.from(uniqueFactors.values());

  return {
    safetyScore: score,
    riskLevel,
    factors
  };
}

import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import { IncidentDocument, validateCoordinates } from '@/lib/db/models';
import { calculateAreaSafetyScore } from '@/lib/safety';

export const dynamic = 'force-dynamic';

export async function handleIntelligence(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const radiusStr = searchParams.get('radius');

    const now = new Date();
    let startTime = new Date();

    if (range === 'today') {
      startTime.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      startTime.setDate(now.getDate() - 7);
    } else if (range === '30d') {
      startTime.setDate(now.getDate() - 30);
    } else {
      startTime.setHours(0, 0, 0, 0);
    }

    const query: Record<string, any> = {
      status: { $ne: 'REJECTED' },
      occurredAt: {
        $gte: startTime.toISOString(),
        $lte: now.toISOString(),
      },
    };

    let userLat = 18.9690;
    let userLng = 72.8193;

    if (latStr && lngStr) {
      const parsedLat = parseFloat(latStr);
      const parsedLng = parseFloat(lngStr);
      const val = validateCoordinates(parsedLat, parsedLng);
      if (val.isValid) {
        userLat = parsedLat;
        userLng = parsedLng;
        const radius = radiusStr ? parseFloat(radiusStr) : 10000;
        const radiusInRadians = radius / 6378137;
        query.location = {
          $geoWithin: {
            $centerSphere: [[userLng, userLat], radiusInRadians],
          },
        };
      }
    }

    const incidents = await db
      .collection<IncidentDocument>('incidents')
      .find(query)
      .sort({ occurredAt: -1 })
      .toArray();

    const targetTimeParam = searchParams.get('targetTime');
    const targetTime = targetTimeParam ? new Date(targetTimeParam) : new Date();

    // Calculate score
    const areaScore = calculateAreaSafetyScore(userLat, userLng, targetTime, incidents as any, []);

    // Time window logic
    let nightCount = 0;
    const totalCount = incidents.length;
    let mostFrequentCategory = 'General';
    let maxCatCount = 0;

    const categoryCounts: Record<string, number> = {};

    incidents.forEach((inc) => {
      const incDate = new Date(inc.occurredAt);
      const h = incDate.getHours();
      if (h >= 18 || h <= 5) nightCount++;

      categoryCounts[inc.category] = (categoryCounts[inc.category] || 0) + 1;
      if (categoryCounts[inc.category] > maxCatCount) {
        maxCatCount = categoryCounts[inc.category];
        mostFrequentCategory = inc.category;
      }
    });

    const isNightHeavy = totalCount > 0 && nightCount / totalCount > 0.5;

    // Cluster hotspots
    const hotspotMap = new Map<string, { name: string; count: number; severitySum: number }>();

    for (const inc of incidents) {
      const lat = typeof inc.lat === 'number' ? inc.lat : inc.location?.coordinates?.[1];
      const lng = typeof inc.lng === 'number' ? inc.lng : inc.location?.coordinates?.[0];
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) continue;

      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      if (!hotspotMap.has(key)) {
        hotspotMap.set(key, {
          name: `Cluster near ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
          count: 0,
          severitySum: 0,
        });
      }
      const spot = hotspotMap.get(key)!;
      spot.count += 1;
      spot.severitySum += typeof inc.severity === 'number' ? inc.severity : 50;
    }

    const hotspots: Array<{
      name: string;
      risk: string;
      fill: number;
      fillClass: string;
      desc: string;
    }> = [];

    for (const spot of Array.from(hotspotMap.values())) {
      const avgSev = spot.severitySum / spot.count;
      hotspots.push({
        name: spot.name,
        risk: avgSev > 75 ? 'Critical' : avgSev > 50 ? 'High' : 'Medium',
        fill: Math.round(avgSev),
        fillClass: avgSev > 75 ? 'bg-danger' : avgSev > 50 ? 'bg-warning' : 'bg-blue-500',
        desc: `${spot.count} incident(s) reported in this cluster.`,
      });
    }

    hotspots.sort((a, b) => b.fill - a.fill);
    const topHotspots = hotspots.slice(0, 3);

    // AI Recommendation
    let aiRec = `Based on analysis of ${totalCount} active records, standard community patrolling is recommended.`;
    if (areaScore.riskLevel === 'ELEVATED') {
      aiRec = `Elevated risk level detected. Increase Guardian deployment with focus on ${mostFrequentCategory} prevention.`;
    } else if (isNightHeavy) {
      aiRec = `Higher incidence rate after dark (${Math.round((nightCount / totalCount) * 100)}%). Prioritize illuminated thoroughfares.`;
    }

    return NextResponse.json({
      score: areaScore.safetyScore,
      trend: `${areaScore.factors[0]?.scoreImpact > 0 ? '+' : ''}${areaScore.factors[0]?.scoreImpact || 0} points based on current conditions`,
      timeWindow: isNightHeavy ? '18:00 - 05:00' : 'Distributed Hours',
      timeText:
        totalCount > 0
          ? `${Math.round((nightCount / totalCount) * 100)}% of incidents occur at night.`
          : 'Insufficient data for night distribution.',
      primaryConcern: mostFrequentCategory,
      concernText: `The most reported issue in this area is ${mostFrequentCategory}.`,
      hotspots: topHotspots,
      aiRec,
      incidentCount: totalCount,
    });
  } catch (error: any) {
    console.error('Failed to get area intelligence:', error);
    return NextResponse.json(
      { error: 'Internal server error calculating intelligence', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleIntelligence(request);
}

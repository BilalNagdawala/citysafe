import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import {
  IncidentDocument,
  AlertDocument,
  JourneyDocument,
  validateCoordinates,
} from '@/lib/db/models';
import { parseLatLng } from '@/lib/geo-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const radiusStr = searchParams.get('radius');

    const incidentQuery: Record<string, any> = {
      status: { $ne: 'REJECTED' },
    };

    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const val = validateCoordinates(lat, lng);
      if (val.isValid) {
        const radius = radiusStr ? parseFloat(radiusStr) : 20000; // default 20km
        const radiusInRadians = radius / 6378137;
        incidentQuery.location = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusInRadians],
          },
        };
      }
    }

    // Query incidents
    const incidents = await db
      .collection<IncidentDocument>('incidents')
      .find(incidentQuery)
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(100)
      .toArray();

    // Query active alerts
    const alerts = await db
      .collection<AlertDocument>('alerts')
      .find({ status: { $in: ['active', 'acknowledged', 'assigned', 'escalated'] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Query active journeys where user granted consent
    const rawJourneys = await db
      .collection<JourneyDocument>('journeys')
      .find({ status: 'active', consentGranted: true })
      .sort({ lastUpdate: -1 })
      .limit(30)
      .toArray();

    // Standardize journey location format before sending to client
    const journeys = rawJourneys.map((j) => {
      const loc = parseLatLng(j.currentLocation);
      return {
        ...j,
        currentLocation: loc
          ? {
              lat: loc.lat,
              lng: loc.lng,
              accuracy: loc.accuracy,
              updatedAt: j.lastUpdate || j.updatedAt || new Date().toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({
      incidents,
      alerts,
      journeys,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to get guardian map data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

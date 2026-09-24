import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import {
  JourneyDocument,
  JourneyLocationDocument,
  createGeoPoint,
  validateCoordinates,
} from '@/lib/db/models';
import { parseLatLng } from '@/lib/geo-utils';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const userId = searchParams.get('userId');

    const query: Record<string, any> = {};
    if (status !== 'all') {
      query.status = status;
    }
    if (userId) {
      query.userId = userId;
    }

    const rawJourneys = await db
      .collection<JourneyDocument>('journeys')
      .find(query)
      .sort({ lastUpdate: -1 })
      .limit(50)
      .toArray();

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

    return NextResponse.json({ success: true, journeys });
  } catch (error: any) {
    console.error('Failed to get journeys:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve journeys', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const val = validateCoordinates(body.lat, body.lng);
    if (!val.isValid) {
      return NextResponse.json({ error: val.error }, { status: 400 });
    }

    const now = new Date().toISOString();
    const journeyId = body.id || `jny-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const userId = body.userId || `usr-${randomUUID().slice(0, 6)}`;
    const geoPoint = createGeoPoint(body.lat, body.lng);

    const newJourney: JourneyDocument = {
      id: journeyId,
      userId,
      userName: body.userName || 'Citizen User',
      status: 'active',
      currentLocation: geoPoint,
      destination: body.destination
        ? {
            lat: body.destination.lat,
            lng: body.destination.lng,
            address: body.destination.address,
          }
        : undefined,
      eta: body.eta || undefined,
      routeScore: typeof body.routeScore === 'number' ? body.routeScore : undefined,
      consentGranted: body.consentGranted !== false,
      createdAt: now,
      updatedAt: now,
      lastUpdate: now,
    };

    await db.collection<JourneyDocument>('journeys').insertOne(newJourney as any);

    // Initial breadcrumb location in journeyLocations collection
    const initialLocation: JourneyLocationDocument = {
      id: `loc-${Date.now()}-${randomUUID().slice(0, 6)}`,
      journeyId,
      userId,
      location: geoPoint,
      timestamp: now,
    };
    await db.collection<JourneyLocationDocument>('journeyLocations').insertOne(initialLocation as any);

    return NextResponse.json({ success: true, journey: newJourney }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create journey in MongoDB:', error);
    return NextResponse.json(
      { error: 'Failed to create journey', details: error.message },
      { status: 500 }
    );
  }
}

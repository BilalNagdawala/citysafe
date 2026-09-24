import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/mongodb';
import {
  JourneyDocument,
  JourneyLocationDocument,
  createGeoPoint,
  validateCoordinates,
} from '@/lib/db/models';
import { parseLatLng } from '@/lib/geo-utils';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const val = validateCoordinates(body.lat, body.lng);
    if (!val.isValid) {
      return NextResponse.json({ error: val.error }, { status: 400 });
    }

    const db = await getDatabase();
    const now = new Date().toISOString();
    const journeyId = body.id || `jny-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const userId = body.userId || `usr-${randomUUID().slice(0, 6)}`;
    const geoPoint = createGeoPoint(body.lat, body.lng);

    // Upsert journey in MongoDB
    await db.collection<JourneyDocument>('journeys').updateOne(
      { id: journeyId },
      {
        $set: {
          currentLocation: geoPoint,
          lastUpdate: now,
          updatedAt: now,
          status: body.status || 'active',
        },
        $setOnInsert: {
          id: journeyId,
          userId,
          userName: body.userName || 'Citizen User',
          consentGranted: true,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Insert breadcrumb
    const locationDoc: JourneyLocationDocument = {
      id: `loc-${Date.now()}-${randomUUID().slice(0, 6)}`,
      journeyId,
      userId,
      location: geoPoint,
      timestamp: now,
    };
    await db.collection<JourneyLocationDocument>('journeyLocations').insertOne(locationDoc as any);

    const journey = await db.collection<JourneyDocument>('journeys').findOne({ id: journeyId });
    const loc = journey ? parseLatLng(journey.currentLocation) : null;

    return NextResponse.json({
      success: true,
      journey: journey
        ? {
            ...journey,
            currentLocation: loc
              ? {
                  lat: loc.lat,
                  lng: loc.lng,
                  accuracy: typeof body.accuracy === 'number' ? body.accuracy : undefined,
                  updatedAt: now,
                }
              : null,
          }
        : null,
      location: locationDoc,
    });
  } catch (error: any) {
    console.error('Failed to update journey location:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Journey ID is required' }, { status: 400 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate coordinates
    const val = validateCoordinates(body.lat, body.lng);
    if (!val.isValid) {
      return NextResponse.json({ error: val.error }, { status: 400 });
    }

    const db = await getDatabase();
    const now = new Date().toISOString();
    const geoPoint = createGeoPoint(body.lat, body.lng);

    const existingJourney = await db.collection<JourneyDocument>('journeys').findOne({ id });
    const userId = existingJourney ? existingJourney.userId : (body.userId || `usr-${randomUUID().slice(0, 6)}`);

    if (!existingJourney) {
      // First valid GPS location creates the journey
      const newJourney: JourneyDocument = {
        id,
        userId,
        userName: body.userName || 'Citizen User',
        status: body.status || 'active',
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
    } else {
      // Update existing journey
      await db.collection<JourneyDocument>('journeys').updateOne(
        { id },
        {
          $set: {
            currentLocation: geoPoint,
            lastUpdate: now,
            updatedAt: now,
            ...(body.status ? { status: body.status } : {}),
            ...(body.destination ? { destination: body.destination } : {}),
            ...(typeof body.routeScore === 'number' ? { routeScore: body.routeScore } : {}),
          },
        }
      );
    }

    // Insert breadcrumb location record
    const locationDoc: JourneyLocationDocument = {
      id: `loc-${Date.now()}-${randomUUID().slice(0, 6)}`,
      journeyId: id,
      userId,
      location: geoPoint,
      speed: typeof body.speed === 'number' ? body.speed : undefined,
      heading: typeof body.heading === 'number' ? body.heading : undefined,
      timestamp: now,
    };
    await db.collection<JourneyLocationDocument>('journeyLocations').insertOne(locationDoc as any);

    const updatedJourney = await db.collection<JourneyDocument>('journeys').findOne({ id });
    const normalizedLoc = updatedJourney ? parseLatLng(updatedJourney.currentLocation) : null;

    return NextResponse.json({
      success: true,
      journey: updatedJourney
        ? {
            ...updatedJourney,
            currentLocation: normalizedLoc
              ? {
                  lat: normalizedLoc.lat,
                  lng: normalizedLoc.lng,
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
      { error: 'Failed to record journey location', details: error.message },
      { status: 500 }
    );
  }
}

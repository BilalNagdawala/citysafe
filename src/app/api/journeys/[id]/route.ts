import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/mongodb';
import { JourneyDocument, JourneyLocationDocument } from '@/lib/db/models';
import { parseLatLng } from '@/lib/geo-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Journey ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const journey = await db.collection<JourneyDocument>('journeys').findOne({ id });

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Retrieve recent location history (breadcrumbs)
    const recentLocations = await db
      .collection<JourneyLocationDocument>('journeyLocations')
      .find({ journeyId: id })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    const loc = parseLatLng(journey.currentLocation);

    return NextResponse.json({
      success: true,
      journey: {
        ...journey,
        currentLocation: loc
          ? {
              lat: loc.lat,
              lng: loc.lng,
              accuracy: loc.accuracy,
              updatedAt: journey.lastUpdate || journey.updatedAt,
            }
          : null,
        breadcrumbs: recentLocations,
      },
    });
  } catch (error: any) {
    console.error('Failed to get journey:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve journey', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const db = await getDatabase();
    const existing = await db.collection<JourneyDocument>('journeys').findOne({ id });

    if (!existing) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Partial<JourneyDocument> = {
      updatedAt: now,
    };

    if (body.status && ['active', 'completed', 'cancelled'].includes(body.status)) {
      updates.status = body.status;
    }

    if (typeof body.routeScore === 'number') {
      updates.routeScore = body.routeScore;
    }

    if (body.eta) {
      updates.eta = body.eta;
    }

    if (body.consentGranted !== undefined) {
      updates.consentGranted = Boolean(body.consentGranted);
    }

    await db.collection<JourneyDocument>('journeys').updateOne(
      { id },
      { $set: updates }
    );

    const updated = await db.collection<JourneyDocument>('journeys').findOne({ id });
    const loc = updated ? parseLatLng(updated.currentLocation) : null;

    return NextResponse.json({
      success: true,
      journey: updated
        ? {
            ...updated,
            currentLocation: loc
              ? {
                  lat: loc.lat,
                  lng: loc.lng,
                  accuracy: loc.accuracy,
                  updatedAt: updated.lastUpdate || updated.updatedAt,
                }
              : null,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Failed to update journey:', error);
    return NextResponse.json(
      { error: 'Failed to update journey', details: error.message },
      { status: 500 }
    );
  }
}

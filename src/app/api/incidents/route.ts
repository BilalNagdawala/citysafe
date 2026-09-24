import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import {
  IncidentDocument,
  AlertDocument,
  AuditLogDocument,
  createGeoPoint,
  validateCoordinates,
} from '@/lib/db/models';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const radiusStr = searchParams.get('radius');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const query: Record<string, any> = {};

    // Validate and apply geo-query if coordinates provided
    if (latStr !== null && lngStr !== null) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const validation = validateCoordinates(lat, lng);
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const radiusInMeters = radiusStr ? Math.max(10, parseFloat(radiusStr)) : 10000;
      const radiusInRadians = radiusInMeters / 6378137; // Earth radius in meters

      // Use $geoWithin with $centerSphere for reliable geospatial querying
      query.location = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians],
        },
      };
    }

    // Time window filters
    if (startTime || endTime) {
      query.occurredAt = {};
      if (startTime) {
        query.occurredAt.$gte = new Date(startTime).toISOString();
      }
      if (endTime) {
        query.occurredAt.$lte = new Date(endTime).toISOString();
      }
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    const incidents = await db
      .collection<IncidentDocument>('incidents')
      .find(query)
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error: any) {
    console.error('Failed to get incidents from MongoDB:', error);
    return NextResponse.json(
      { error: 'Internal server error while retrieving incidents', details: error.message },
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

    if (!body.category || typeof body.category !== 'string') {
      return NextResponse.json({ error: 'Incident category is required' }, { status: 400 });
    }

    // Coordinate validation
    const validation = validateCoordinates(body.lat, body.lng);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const lat = body.lat;
    const lng = body.lng;
    const now = new Date().toISOString();

    const severity = Math.min(100, Math.max(1, typeof body.severity === 'number' ? body.severity : 50));
    const isAnonymous = Boolean(body.isAnonymous);
    const confidence = isAnonymous ? 35 : 70;

    const incidentId = `inc_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const occurredAt = body.occurredAt ? new Date(body.occurredAt).toISOString() : now;

    const newIncident: IncidentDocument = {
      id: incidentId,
      category: body.category.trim(),
      severity,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      location: createGeoPoint(lat, lng),
      lat,
      lng,
      occurredAt,
      createdAt: now,
      updatedAt: now,
      isAnonymous,
      status: 'PENDING',
      confidence,
      photoUrl: body.photoUrl || undefined,
      photoStorageKey: body.photoStorageKey || undefined,
      photoMimeType: body.photoMimeType || undefined,
      photoSize: body.photoSize || undefined,
      photoUploadedAt: body.photoUploadedAt || undefined,
      timeline: [
        {
          action: 'Report Submitted',
          timestamp: now,
          note: isAnonymous ? 'Anonymous Citizen Report' : 'Citizen Verified Report',
          actor: isAnonymous ? 'Anonymous' : (body.userName || 'Citizen'),
        },
      ],
    };

    // Insert into MongoDB
    await db.collection<IncidentDocument>('incidents').insertOne(newIncident as any);

    // If severity > 70, automatically generate an Alert in MongoDB
    if (severity > 70) {
      const alertId = `alt-inc-${Date.now()}-${randomUUID().slice(0, 4)}`;
      const newAlert: AlertDocument = {
        id: alertId,
        type: 'incident',
        title: `High Severity: ${newIncident.category}`,
        description: newIncident.description || `Severe ${newIncident.category} reported at coordinates.`,
        status: 'active',
        location: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
        geo: createGeoPoint(lat, lng),
        severity: severity >= 85 ? 'critical' : 'high',
        createdAt: now,
        updatedAt: now,
      };

      await db.collection<AlertDocument>('alerts').insertOne(newAlert as any);
    }

    // Record in audit log
    const auditLog: AuditLogDocument = {
      id: `aud-${Date.now()}-${randomUUID().slice(0, 6)}`,
      action: 'INCIDENT_CREATED',
      entityType: 'incident',
      entityId: incidentId,
      actor: isAnonymous ? 'Anonymous' : (body.userName || 'Citizen'),
      details: {
        category: newIncident.category,
        severity: newIncident.severity,
        lat,
        lng,
        hasPhoto: !!newIncident.photoUrl,
      },
      timestamp: now,
    };
    await db.collection<AuditLogDocument>('auditLogs').insertOne(auditLog as any);

    return NextResponse.json({ success: true, incident: newIncident }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create incident in MongoDB:', error);
    return NextResponse.json(
      { error: 'Failed to record incident', details: error.message },
      { status: 500 }
    );
  }
}

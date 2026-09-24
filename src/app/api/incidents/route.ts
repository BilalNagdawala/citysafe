import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import {
  IncidentDocument,
  AlertDocument,
  AuditLogDocument,
  UploadDocument,
  createGeoPoint,
  validateCoordinates,
} from '@/lib/db/models';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET(request: Request) {
  const reqId = `inc_get_${Date.now()}_${randomUUID().slice(0, 4)}`;
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
        console.warn(`[GET /api/incidents] [${reqId}] Invalid geo params: lat=${latStr}, lng=${lngStr}`);
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

    console.log(`[GET /api/incidents] [${reqId}] Returned ${incidents.length} incidents`);

    return NextResponse.json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error: any) {
    console.error(`[GET /api/incidents] [${reqId}] Database error:`, error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while retrieving incidents',
        details: error?.message || 'Unknown database error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const reqId = `inc_post_${Date.now()}_${randomUUID().slice(0, 6)}`;
  console.log(`[POST /api/incidents] [${reqId}] Processing incoming incident report`);

  try {
    const db = await getDatabase();
    await ensureIndexes();

    const contentType = request.headers.get('content-type') || '';
    let category = '';
    let severity = 50;
    let description = '';
    let lat: number | undefined;
    let lng: number | undefined;
    let isAnonymous = false;
    let occurredAtInput: string | undefined;
    let userName: string | undefined;

    let photoUrl: string | undefined;
    let photoStorageKey: string | undefined;
    let photoMimeType: string | undefined;
    let photoSize: number | undefined;
    let photoUploadedAt: string | undefined;

    // Handle multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      console.log(`[POST /api/incidents] [${reqId}] Parsing multipart/form-data payload`);
      const formData = await request.formData();

      category = (formData.get('category') as string) || '';
      description = (formData.get('description') as string) || '';
      const sevRaw = formData.get('severity');
      if (sevRaw) severity = parseInt(sevRaw as string, 10) || 50;

      const latRaw = formData.get('lat');
      const lngRaw = formData.get('lng');
      if (latRaw) lat = parseFloat(latRaw as string);
      if (lngRaw) lng = parseFloat(lngRaw as string);

      isAnonymous = formData.get('isAnonymous') === 'true' || formData.get('isAnonymous') === '1';
      occurredAtInput = (formData.get('occurredAt') as string) || undefined;
      userName = (formData.get('userName') as string) || undefined;

      // Handle optional attached photo file
      const file = formData.get('file') as File | null;
      if (file && file.size > 0) {
        const mimeType = (file.type || '').toLowerCase();
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
          console.warn(`[POST /api/incidents] [${reqId}] Rejected photo type: ${mimeType}`);
          return NextResponse.json(
            { success: false, error: 'Unsupported photo type. Allowed: JPG, PNG, WebP.' },
            { status: 400 }
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          console.warn(`[POST /api/incidents] [${reqId}] Photo size exceeds 5MB limit: ${file.size}`);
          return NextResponse.json(
            { success: false, error: 'Photo exceeds maximum 5MB size limit' },
            { status: 400 }
          );
        }

        const buffer = await file.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');
        let ext = 'jpg';
        if (mimeType === 'image/png') ext = 'png';
        else if (mimeType === 'image/webp') ext = 'webp';

        const fileId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
        const filename = `${fileId}.${ext}`;
        const now = new Date().toISOString();

        // Save persistently in MongoDB
        const uploadDoc: UploadDocument = {
          id: filename,
          filename,
          mimeType,
          size: file.size,
          data: base64Data,
          uploadedAt: now,
        };

        await db.collection<UploadDocument>('uploads').insertOne(uploadDoc as any);
        photoUrl = `/api/uploads/${filename}`;
        photoStorageKey = filename;
        photoMimeType = mimeType;
        photoSize = file.size;
        photoUploadedAt = now;
        console.log(`[POST /api/incidents] [${reqId}] Photo uploaded and saved to DB: ${photoUrl}`);
      }
    } else {
      // Handle application/json
      console.log(`[POST /api/incidents] [${reqId}] Parsing application/json payload`);
      const body = await request.json();

      if (!body || typeof body !== 'object') {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
      }

      category = body.category || '';
      description = body.description || '';
      severity = typeof body.severity === 'number' ? body.severity : 50;

      // Coordinate flexibility: check top-level lat/lng, coordinates object, or coordinates array
      if (typeof body.lat === 'number') {
        lat = body.lat;
      } else if (body.coordinates && typeof body.coordinates.lat === 'number') {
        lat = body.coordinates.lat;
      } else if (Array.isArray(body.coordinates) && body.coordinates.length >= 2) {
        lat = body.coordinates[1]; // GeoJSON [lng, lat]
      }

      if (typeof body.lng === 'number') {
        lng = body.lng;
      } else if (body.coordinates && typeof body.coordinates.lng === 'number') {
        lng = body.coordinates.lng;
      } else if (Array.isArray(body.coordinates) && body.coordinates.length >= 2) {
        lng = body.coordinates[0]; // GeoJSON [lng, lat]
      }

      isAnonymous = Boolean(body.isAnonymous);
      occurredAtInput = body.occurredAt;
      userName = body.userName;

      photoUrl = body.photoUrl || undefined;
      photoStorageKey = body.photoStorageKey || undefined;
      photoMimeType = body.photoMimeType || undefined;
      photoSize = body.photoSize || undefined;
      photoUploadedAt = body.photoUploadedAt || undefined;
    }

    // Validation
    if (!category || typeof category !== 'string' || !category.trim()) {
      console.warn(`[POST /api/incidents] [${reqId}] Validation failed: Category is required`);
      return NextResponse.json({ success: false, error: 'Incident category is required' }, { status: 400 });
    }

    const validation = validateCoordinates(lat, lng);
    if (!validation.isValid) {
      console.warn(`[POST /api/incidents] [${reqId}] Validation failed: Coordinates invalid (${validation.error})`);
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const validLat = lat as number;
    const validLng = lng as number;

    const clampedSeverity = Math.min(100, Math.max(1, severity));
    const nowUtc = new Date().toISOString();

    let occurredAt = nowUtc;
    if (occurredAtInput) {
      const parsedDate = new Date(occurredAtInput);
      if (!isNaN(parsedDate.getTime())) {
        occurredAt = parsedDate.toISOString();
      }
    }

    const incidentId = `inc_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const confidence = isAnonymous ? 35 : 70;

    const newIncident: IncidentDocument = {
      id: incidentId,
      category: category.trim(),
      severity: clampedSeverity,
      description: typeof description === 'string' ? description.trim() : '',
      location: createGeoPoint(validLat, validLng),
      lat: validLat,
      lng: validLng,
      occurredAt,
      createdAt: nowUtc,
      updatedAt: nowUtc,
      isAnonymous,
      status: 'PENDING',
      confidence,
      photoUrl,
      photoStorageKey,
      photoMimeType,
      photoSize,
      photoUploadedAt,
      timeline: [
        {
          action: 'Report Submitted',
          timestamp: nowUtc,
          note: isAnonymous ? 'Anonymous Citizen Report' : 'Citizen Verified Report',
          actor: isAnonymous ? 'Anonymous' : (userName || 'Citizen'),
        },
      ],
    };

    // 1. Insert into hosted MongoDB incidents collection
    await db.collection<IncidentDocument>('incidents').insertOne(newIncident as any);
    console.log(`[POST /api/incidents] [${reqId}] Incident saved to DB: ${incidentId}`);

    // 2. If severity > 70, automatically generate an Alert in MongoDB
    if (clampedSeverity > 70) {
      const alertId = `alt-inc-${Date.now()}-${randomUUID().slice(0, 4)}`;
      const newAlert: AlertDocument = {
        id: alertId,
        type: 'incident',
        title: `High Severity: ${newIncident.category}`,
        description: newIncident.description || `Severe ${newIncident.category} reported at coordinates.`,
        status: 'active',
        location: `Lat: ${validLat.toFixed(4)}, Lng: ${validLng.toFixed(4)}`,
        geo: createGeoPoint(validLat, validLng),
        lat: validLat,
        lng: validLng,
        severity: clampedSeverity >= 85 ? 'critical' : 'high',
        createdAt: nowUtc,
        updatedAt: nowUtc,
      };

      await db.collection<AlertDocument>('alerts').insertOne(newAlert as any);
      console.log(`[POST /api/incidents] [${reqId}] High severity alert generated: ${alertId}`);
    }

    // 3. Record in audit log
    const auditLog: AuditLogDocument = {
      id: `aud-${Date.now()}-${randomUUID().slice(0, 6)}`,
      action: 'INCIDENT_CREATED',
      entityType: 'incident',
      entityId: incidentId,
      actor: isAnonymous ? 'Anonymous' : (userName || 'Citizen'),
      details: {
        category: newIncident.category,
        severity: newIncident.severity,
        lat: validLat,
        lng: validLng,
        hasPhoto: Boolean(newIncident.photoUrl),
      },
      timestamp: nowUtc,
    };
    await db.collection<AuditLogDocument>('auditLogs').insertOne(auditLog as any);

    return NextResponse.json(
      {
        success: true,
        incidentId,
        incident: newIncident,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(`[POST /api/incidents] [${reqId}] Failed to record incident:`, error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record incident',
        details: error?.message || 'Database connection error',
      },
      { status: 500 }
    );
  }
}

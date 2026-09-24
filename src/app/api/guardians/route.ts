import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import { GuardianDocument, createGeoPoint, validateCoordinates } from '@/lib/db/models';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const id = searchParams.get('id');

    if (id || email) {
      const guardian = await db
        .collection<GuardianDocument>('guardians')
        .findOne(id ? { id } : { email: email! });
      if (!guardian) {
        return NextResponse.json({ error: 'Guardian not found' }, { status: 404 });
      }
      return NextResponse.json({ guardian });
    }

    const guardians = await db
      .collection<GuardianDocument>('guardians')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ guardians });
  } catch (error: any) {
    console.error('Failed to get guardians:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const body = await request.json();
    if (!body || !body.name || !body.phone) {
      return NextResponse.json({ error: 'Name and phone number are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const email = body.email ? body.email.trim().toLowerCase() : `guardian-${randomUUID().slice(0, 6)}@citysafe.local`;
    const guardianId = body.id || `GUA-${Math.floor(Math.random() * 900) + 100}`;

    let location = undefined;
    if (typeof body.lat === 'number' && typeof body.lng === 'number') {
      const val = validateCoordinates(body.lat, body.lng);
      if (val.isValid) {
        location = createGeoPoint(body.lat, body.lng);
      }
    }

    const guardianDoc: GuardianDocument = {
      id: guardianId,
      userId: body.userId || undefined,
      name: body.name.trim(),
      email,
      phone: body.phone.trim(),
      role: body.role || (body.orgType === 'independent' ? 'Independent Volunteer' : 'Field Responder'),
      orgType: body.orgType || 'independent',
      organization: body.organization || (body.orgType === 'independent' ? 'Independent' : 'Community Volunteer Group'),
      areaOfOperation: body.areaOfOperation || 'Metropolitan Area',
      assignedRegion: body.areaOfOperation || undefined,
      verificationStatus: 'VERIFIED',
      verified: true,
      location,
      createdAt: now,
      updatedAt: now,
    };

    // Upsert into guardians collection
    await db.collection<GuardianDocument>('guardians').updateOne(
      { email },
      {
        $set: {
          name: guardianDoc.name,
          phone: guardianDoc.phone,
          role: guardianDoc.role,
          orgType: guardianDoc.orgType,
          organization: guardianDoc.organization,
          areaOfOperation: guardianDoc.areaOfOperation,
          assignedRegion: guardianDoc.assignedRegion,
          verificationStatus: guardianDoc.verificationStatus,
          verified: guardianDoc.verified,
          location: guardianDoc.location,
          updatedAt: now,
        },
        $setOnInsert: {
          id: guardianId,
          email,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const saved = await db.collection<GuardianDocument>('guardians').findOne({ email });

    return NextResponse.json({ success: true, guardian: saved }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to register guardian:', error);
    return NextResponse.json({ error: 'Failed to save guardian', details: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import { UserDocument } from '@/lib/db/models';
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
      const user = await db
        .collection<UserDocument>('users')
        .findOne(id ? { id } : { email: email! });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user });
    }

    const users = await db.collection<UserDocument>('users').find({}).limit(50).toArray();
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Failed to get users:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const body = await request.json();
    if (!body || !body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const email = body.email ? body.email.trim().toLowerCase() : `user-${randomUUID().slice(0, 6)}@citysafe.local`;
    const userId = body.id || `usr-${Date.now()}-${randomUUID().slice(0, 6)}`;

    // Upsert by email or ID
    const userDoc: UserDocument = {
      id: userId,
      name: body.name.trim(),
      email,
      phone: body.phone ? body.phone.trim() : undefined,
      role: body.role === 'guardian' ? 'guardian' : 'user',
      emergencyContacts: body.emergencyContacts || [],
      emergencyPreferences: body.emergencyPreferences || {
        shareLiveLocation: true,
        autoRecordAudio: true,
        notifyContacts: true,
      },
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<UserDocument>('users').updateOne(
      { email },
      {
        $set: {
          name: userDoc.name,
          phone: userDoc.phone,
          role: userDoc.role,
          emergencyContacts: userDoc.emergencyContacts,
          emergencyPreferences: userDoc.emergencyPreferences,
          updatedAt: now,
        },
        $setOnInsert: {
          id: userId,
          email,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const savedUser = await db.collection<UserDocument>('users').findOne({ email });

    return NextResponse.json({ success: true, user: savedUser }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to register/update user:', error);
    return NextResponse.json({ error: 'Failed to save user', details: error.message }, { status: 500 });
  }
}

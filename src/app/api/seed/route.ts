import { NextResponse } from 'next/server';
import { getDatabase, ensureIndexes } from '@/lib/db/mongodb';
import { createGeoPoint, IncidentDocument, AlertDocument, GuardianDocument } from '@/lib/db/models';

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    await ensureIndexes();

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const incidentsCount = await db.collection('incidents').countDocuments();
    if (incidentsCount > 0 && !force) {
      return NextResponse.json({
        message: 'Database already contains data. Use ?force=true to reset and re-seed.',
        counts: {
          incidents: incidentsCount,
          alerts: await db.collection('alerts').countDocuments(),
          guardians: await db.collection('guardians').countDocuments(),
        }
      });
    }

    if (force) {
      await db.collection('incidents').deleteMany({});
      await db.collection('alerts').deleteMany({});
      await db.collection('guardians').deleteMany({});
      await db.collection('caseNotes').deleteMany({});
      await db.collection('auditLogs').deleteMany({});
    }

    const now = new Date();
    const isoNow = now.toISOString();
    const tenMinAgo = new Date(now.getTime() - 10 * 60000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 120 * 60000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600000).toISOString();

    // Deterministic Initial Incidents
    const initialIncidents: IncidentDocument[] = [
      {
        id: 'inc-seed-001',
        category: 'Poor Lighting',
        severity: 45,
        description: 'Street lights flickering and dark stretch under bridge near transit hub.',
        location: createGeoPoint(18.9695, 72.8205),
        lat: 18.9695,
        lng: 72.8205,
        occurredAt: twoHoursAgo,
        createdAt: twoHoursAgo,
        updatedAt: twoHoursAgo,
        isAnonymous: false,
        status: 'VERIFIED',
        confidence: 85,
        timeline: [
          { action: 'Report Submitted', timestamp: twoHoursAgo, note: 'Citizen reported via mobile app' },
          { action: 'System Verified', timestamp: tenMinAgo, note: 'Corroborated by historical cluster', actor: 'Automated System' }
        ]
      },
      {
        id: 'inc-seed-002',
        category: 'Harassment',
        severity: 78,
        description: 'Verbal harassment reported near crowded marketplace lane.',
        location: createGeoPoint(18.9730, 72.8250),
        lat: 18.9730,
        lng: 72.8250,
        occurredAt: tenMinAgo,
        createdAt: tenMinAgo,
        updatedAt: tenMinAgo,
        isAnonymous: true,
        status: 'PENDING',
        confidence: 65,
        timeline: [
          { action: 'Report Submitted', timestamp: tenMinAgo, note: 'Anonymous report submitted' }
        ]
      },
      {
        id: 'inc-seed-003',
        category: 'Obstruction',
        severity: 30,
        description: 'Fallen construction debris blocking pedestrian sidewalk.',
        location: createGeoPoint(18.9650, 72.8150),
        lat: 18.9650,
        lng: 72.8150,
        occurredAt: oneDayAgo,
        createdAt: oneDayAgo,
        updatedAt: tenMinAgo,
        isAnonymous: false,
        status: 'RESOLVED',
        confidence: 90,
        timeline: [
          { action: 'Report Submitted', timestamp: oneDayAgo },
          { action: 'Resolved', timestamp: tenMinAgo, note: 'Cleared by municipal response unit' }
        ]
      }
    ];

    // Deterministic Initial Alerts
    const initialAlerts: AlertDocument[] = [
      {
        id: 'alt-seed-001',
        type: 'sos',
        title: 'SOS Alert - Emergency Triggered',
        description: 'User triggered SOS emergency distress signal near South corridor.',
        status: 'active',
        location: 'Lat: 18.9730, Lng: 72.8250',
        geo: createGeoPoint(18.9730, 72.8250),
        lat: 18.9730,
        lng: 72.8250,
        severity: 'critical',
        createdAt: tenMinAgo,
        updatedAt: tenMinAgo
      },
      {
        id: 'alt-seed-002',
        type: 'incident',
        title: 'High Severity: Harassment',
        description: 'Verbal harassment reported near crowded marketplace lane.',
        status: 'acknowledged',
        location: 'Lat: 18.9730, Lng: 72.8250',
        geo: createGeoPoint(18.9730, 72.8250),
        lat: 18.9730,
        lng: 72.8250,
        severity: 'high',
        createdAt: tenMinAgo,
        updatedAt: isoNow,
        acknowledgedAt: isoNow
      }
    ];

    // Deterministic Initial Guardians
    const initialGuardians: GuardianDocument[] = [
      {
        id: 'gua-seed-001',
        name: 'Arjun Mehta',
        email: 'arjun.mehta@guardiannetwork.org',
        phone: '+91 98200 12345',
        role: 'Field Supervisor',
        orgType: 'ngo',
        organization: 'Community Shield Foundation',
        areaOfOperation: 'Metro South Corridor',
        verificationStatus: 'VERIFIED',
        verified: true,
        location: createGeoPoint(18.9680, 72.8190),
        createdAt: oneDayAgo,
        updatedAt: isoNow
      },
      {
        id: 'gua-seed-002',
        name: 'Pooja Sharma',
        email: 'pooja.sharma@communityresponse.org',
        phone: '+91 98200 67890',
        role: 'Community Patrol Lead',
        orgType: 'community',
        organization: 'Women Safety Patrol',
        areaOfOperation: 'Central Market District',
        verificationStatus: 'VERIFIED',
        verified: true,
        location: createGeoPoint(18.9720, 72.8240),
        createdAt: oneDayAgo,
        updatedAt: isoNow
      }
    ];

    await db.collection('incidents').insertMany(initialIncidents as any);
    await db.collection('alerts').insertMany(initialAlerts as any);
    await db.collection('guardians').insertMany(initialGuardians as any);

    return NextResponse.json({
      success: true,
      message: 'Deterministic seed data successfully loaded into local MongoDB',
      counts: {
        incidents: initialIncidents.length,
        alerts: initialAlerts.length,
        guardians: initialGuardians.length,
      }
    });
  } catch (error: any) {
    console.error('Failed to seed database:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: error.message },
      { status: 500 }
    );
  }
}

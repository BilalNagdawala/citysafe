import { randomUUID } from 'crypto';

class MockCursor {
  private data: any[];
  
  constructor(data: any[], private query: any) {
    // Very basic filter matching (id, email, status)
    this.data = data.filter(item => {
      if (!query || Object.keys(query).length === 0) return true;
      for (const [key, value] of Object.entries(query)) {
        // Skip complex mongo operators like $geoWithin for this mock
        if (key === 'location' || key === 'geo' || key === 'occurredAt') continue;
        if (typeof value !== 'object' && item[key] !== value) return false;
      }
      return true;
    });
  }

  sort(sortObj: any) {
    if (!sortObj || Object.keys(sortObj).length === 0) return this;
    const key = Object.keys(sortObj)[0];
    const dir = sortObj[key] === -1 ? -1 : 1;
    this.data.sort((a, b) => {
      if (a[key] < b[key]) return -1 * dir;
      if (a[key] > b[key]) return 1 * dir;
      return 0;
    });
    return this;
  }

  limit(n: number) {
    this.data = this.data.slice(0, n);
    return this;
  }

  async toArray() {
    return this.data;
  }
}

class MockCollection {
  private data: any[] = [];

  find(query: any) {
    return new MockCursor(this.data, query);
  }

  async findOne(query: any) {
    const cursor = new MockCursor(this.data, query);
    return cursor.toArray().then(arr => arr.length > 0 ? arr[0] : null);
  }

  async insertOne(doc: any) {
    const docToInsert = { ...doc };
    if (!docToInsert._id) docToInsert._id = randomUUID();
    this.data.push(docToInsert);
    return { insertedId: docToInsert._id };
  }

  async insertMany(docs: any[]) {
    for (const doc of docs) {
      const docToInsert = { ...doc };
      if (!docToInsert._id) docToInsert._id = randomUUID();
      this.data.push(docToInsert);
    }
    return { insertedCount: docs.length };
  }

  async updateOne(filter: any, update: any) {
    const item = await this.findOne(filter);
    if (item) {
      if (update.$set) Object.assign(item, update.$set);
      if (update.$push) {
        for (const [key, value] of Object.entries(update.$push)) {
          if (!item[key]) item[key] = [];
          (item[key] as any[]).push(value);
        }
      }
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  }

  async deleteMany(filter: any) {
    const initialLen = this.data.length;
    // For simplicity, just clearing if filter is {}
    if (Object.keys(filter).length === 0) {
      this.data = [];
    }
    return { deletedCount: initialLen - this.data.length };
  }

  async countDocuments() {
    return this.data.length;
  }

  async createIndex() {
    return; // No-op
  }
}

class MockDbImpl {
  private collections = new Map<string, MockCollection>();
  
  constructor() {
    this.seedData();
  }

  private seedData() {
    const now = new Date();
    const isoNow = now.toISOString();
    const tenMinAgo = new Date(now.getTime() - 10 * 60000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 120 * 60000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600000).toISOString();

    const createGeoPoint = (lat: number, lng: number) => ({ type: 'Point', coordinates: [lng, lat] });

    this.collection('incidents').insertMany([
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
    ]);

    this.collection('alerts').insertMany([
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
    ]);

    this.collection('guardians').insertMany([
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
    ]);
  }

  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection());
    }
    return this.collections.get(name)!;
  }
}

// Global instance to persist mock data across hot-reloads/function invocations
declare global {
  // eslint-disable-next-line no-var
  var _mockDbInstance: MockDbImpl | undefined;
}

export function getMockDatabase(): any {
  if (!global._mockDbInstance) {
    global._mockDbInstance = new MockDbImpl();
    console.log('[Mock DB] Initialized new in-memory database instance.');
  }
  return global._mockDbInstance;
}

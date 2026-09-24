import { MongoClient, Db } from 'mongodb';

const dbName = process.env.MONGODB_DB || 'citysafe';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Validates connection string safety for the current environment.
 */
function checkUriConfiguration(uri: string): { isLocalhost: boolean; isAtlas: boolean } {
  const isLocalhost = uri.includes('localhost') || uri.includes('127.0.0.1');
  const isAtlas = uri.startsWith('mongodb+srv://') || uri.includes('.mongodb.net');
  return { isLocalhost, isAtlas };
}

import { getMockDatabase } from './mockdb';

/**
 * Returns the cached MongoClient promise.
 * Reuses connection across warm serverless function invocations on Vercel.
 */
export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/citysafe';

  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const { isLocalhost } = checkUriConfiguration(uri);

  // If we are on Vercel and the user hasn't provided a real hosted MongoDB URL,
  // we return a fake MongoClient that just fulfills the type signature loosely, 
  // because getDatabase() handles the real mock logic.
  if (isProduction && isLocalhost) {
    console.warn('Using IN-MEMORY mock database because MONGODB_URI points to localhost in a production environment.');
    return { db: () => getMockDatabase() } as any;
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    global._mongoClientPromise = client.connect();
  }

  try {
    return await global._mongoClientPromise;
  } catch (error: any) {
    // Reset promise so subsequent requests can retry connecting
    global._mongoClientPromise = undefined;
    const sanitizedError = error?.message?.replace(/mongodb(\+srv)?:\/\/[^@]+@/i, 'mongodb$1://***:***@') || 'Unknown error';
    throw new Error(`Failed to connect to MongoDB: ${sanitizedError}`);
  }
}

/**
 * Returns the application database instance.
 */
export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/citysafe';
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const { isLocalhost } = checkUriConfiguration(uri);

  if (isProduction && isLocalhost) {
    return getMockDatabase();
  }

  const client = await getMongoClient();
  return client.db(dbName);
}

// Track index initialization to avoid re-running on every request
let indexesInitialized = false;

/**
 * Ensures required 2dsphere and querying indexes exist across collections.
 */
export async function ensureIndexes(): Promise<void> {
  if (indexesInitialized) return;
  try {
    const db = await getDatabase();

    // 1. Incidents 2dsphere index for location queries
    await db.collection('incidents').createIndex({ location: '2dsphere' });
    await db.collection('incidents').createIndex({ id: 1 }, { unique: true });
    await db.collection('incidents').createIndex({ status: 1, occurredAt: -1 });

    // 2. Alerts 2dsphere index and status indexes
    await db.collection('alerts').createIndex({ geo: '2dsphere' }, { sparse: true });
    await db.collection('alerts').createIndex({ id: 1 }, { unique: true });
    await db.collection('alerts').createIndex({ status: 1, createdAt: -1 });

    // 3. Journeys & Live Journey Locations 2dsphere indexes
    await db.collection('journeys').createIndex({ currentLocation: '2dsphere' }, { sparse: true });
    await db.collection('journeys').createIndex({ id: 1 }, { unique: true });
    await db.collection('journeys').createIndex({ status: 1, lastUpdate: -1 });

    await db.collection('journeyLocations').createIndex({ location: '2dsphere' });
    await db.collection('journeyLocations').createIndex({ journeyId: 1, timestamp: -1 });

    // 4. Guardians
    await db.collection('guardians').createIndex({ location: '2dsphere' }, { sparse: true });
    await db.collection('guardians').createIndex({ id: 1 }, { unique: true });
    await db.collection('guardians').createIndex({ email: 1 }, { sparse: true });

    // 5. Users
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });

    // 6. Case Notes & Audit Logs
    await db.collection('caseNotes').createIndex({ reportId: 1, createdAt: -1 });
    await db.collection('auditLogs').createIndex({ entityId: 1, timestamp: -1 });

    // 7. Persistent Uploads collection
    await db.collection('uploads').createIndex({ id: 1 }, { unique: true });
    await db.collection('uploads').createIndex({ filename: 1 });
    await db.collection('uploads').createIndex({ uploadedAt: -1 });

    indexesInitialized = true;
  } catch (err: any) {
    console.error('Failed to initialize database indexes:', err?.message || err);
  }
}

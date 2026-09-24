import { MongoClient, Db } from 'mongodb';

// Ensure MongoDB URI is only read on the server side
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'citysafe';

if (!uri) {
  // Clear configuration error without logging any connection strings
  console.warn('⚠️ MONGODB_URI is not defined in environment variables. Please check .env.local.');
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.MONGODB_URI) {
  // Provide deferred rejected promise if missing, handled gracefully in getDatabase()
  clientPromise = Promise.reject(new Error('MONGODB_URI is not configured in .env.local'));
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri!, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri!, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });
  clientPromise = client.connect();
}

/**
 * Returns the cached MongoClient promise.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error('Database configuration missing: MONGODB_URI is not set.');
  }
  try {
    return await clientPromise;
  } catch (error: any) {
    throw new Error(
      `Failed to connect to local MongoDB. Ensure MongoDB service is running on 127.0.0.1:27017. Details: ${error.message}`
    );
  }
}

/**
 * Returns the application database instance.
 */
export async function getDatabase(): Promise<Db> {
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

    indexesInitialized = true;
  } catch (err: any) {
    console.error('Failed to initialize database indexes:', err.message);
  }
}

export default clientPromise;

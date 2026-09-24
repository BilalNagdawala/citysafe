import fs from 'fs';
import path from 'path';

export interface IncidentReport {
  id: string;
  category: string;
  severity: number; // 1-100
  description?: string;
  lat: number;
  lng: number;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  isAnonymous: boolean;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ASSIGNED' | 'RESOLVED' | 'ESCALATED';
  confidence: number; // 1-100
  photoUrl?: string;
  photoStorageKey?: string;
  photoMimeType?: string;
  photoUploadedAt?: string;
  timeline?: { action: string; timestamp: string; note?: string }[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE_PATH = path.join(DATA_DIR, 'incidents.json');

// In-memory fallback
let memoryIncidents: IncidentReport[] = [];

// Initialize data directory if it doesn't exist
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create .data directory. Falling back to memory-only storage.');
}

function loadIncidents(): IncidentReport[] {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data) as any[];
      // Migrate old data
      return parsed.map(inc => ({
        ...inc,
        occurredAt: inc.occurredAt || inc.timestamp || new Date().toISOString(),
        createdAt: inc.createdAt || inc.timestamp || new Date().toISOString(),
        updatedAt: inc.updatedAt || inc.timestamp || new Date().toISOString(),
      })) as IncidentReport[];
    }
  } catch (e) {
    console.warn('Error reading incidents file, using memory storage', e);
  }
  return memoryIncidents;
}

function saveIncidents(incidents: IncidentReport[]) {
  memoryIncidents = incidents;
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(incidents, null, 2));
  } catch (e) {
    console.warn('Error writing incidents file, using memory storage', e);
  }
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

export function getAllIncidents(lat?: number, lng?: number, radiusStr?: number, startTime?: string, endTime?: string): IncidentReport[] {
  let incidents = loadIncidents();
  
  if (startTime) {
    incidents = incidents.filter(inc => new Date(inc.occurredAt) >= new Date(startTime));
  }
  
  if (endTime) {
    incidents = incidents.filter(inc => new Date(inc.occurredAt) <= new Date(endTime));
  }

  if (lat !== undefined && lng !== undefined && radiusStr !== undefined) {
    const radius = Number(radiusStr);
    incidents = incidents.filter(inc => {
      const dist = getDistance(lat, lng, inc.lat, inc.lng);
      return dist <= radius;
    });
  }
  
  return incidents;
}

export function addIncident(report: Omit<IncidentReport, 'id' | 'status' | 'confidence' | 'createdAt' | 'updatedAt' | 'timeline'>): IncidentReport {
  const incidents = loadIncidents();
  
  // Basic classification & confidence logic
  // Anonymous gets lower base confidence
  const confidence = report.isAnonymous ? 30 : 60;
  
  const now = new Date().toISOString();
  
  const newIncident: IncidentReport = {
    ...report,
    id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: now,
    updatedAt: now,
    status: 'PENDING',
    confidence,
    timeline: [{ action: 'Report Submitted', timestamp: now }],
  };

  incidents.push(newIncident);
  saveIncidents(incidents);
  
  return newIncident;
}

export function updateIncident(id: string, updates: Partial<IncidentReport>): IncidentReport | null {
  const incidents = loadIncidents();
  const index = incidents.findIndex(inc => inc.id === id);
  if (index === -1) return null;
  
  const updatedIncident = {
    ...incidents[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  incidents[index] = updatedIncident;
  saveIncidents(incidents);
  return updatedIncident;
}

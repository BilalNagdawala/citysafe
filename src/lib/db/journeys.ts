import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'src', 'lib', 'db', 'journeys.json');

export interface Journey {
  id: string;
  userId: string;
  userName?: string;
  status: 'active' | 'completed' | 'cancelled';
  currentLocation: { lat: number; lng: number };
  destination?: { lat: number; lng: number; address?: string };
  eta?: string;
  routeScore?: number;
  lastUpdate: string;
  consentGranted: boolean;
}

export function loadJourneys(): Journey[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load journeys:', error);
  }
  return [];
}

export function saveJourneys(journeys: Journey[]): void {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(journeys, null, 2));
  } catch (error) {
    console.error('Failed to save journeys:', error);
  }
}

export function getActiveJourneys(): Journey[] {
  return loadJourneys().filter(j => j.status === 'active' && j.consentGranted);
}

export function updateJourneyLocation(
  id: string, 
  userId: string, 
  lat: number, 
  lng: number, 
  status: Journey['status'] = 'active'
): Journey {
  const journeys = loadJourneys();
  const existingIdx = journeys.findIndex(j => j.id === id);

  if (existingIdx >= 0) {
    journeys[existingIdx] = {
      ...journeys[existingIdx],
      currentLocation: { lat, lng },
      lastUpdate: new Date().toISOString(),
      status
    };
    saveJourneys(journeys);
    return journeys[existingIdx];
  } else {
    // create new journey
    const newJourney: Journey = {
      id,
      userId,
      userName: 'Citizen User', // Placeholder since auth is mocked
      status,
      currentLocation: { lat, lng },
      lastUpdate: new Date().toISOString(),
      consentGranted: true, // Assuming POST implies consent
    };
    journeys.push(newJourney);
    saveJourneys(journeys);
    return newJourney;
  }
}

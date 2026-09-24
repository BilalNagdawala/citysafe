import fs from 'fs';
import path from 'path';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type AlertType = 'sos' | 'incident' | 'system';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  status: AlertStatus;
  location?: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  assignedAt?: string;
  escalatedAt?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const dbPath = path.join(process.cwd(), 'src/lib/db/alerts.json');

const INITIAL_ALERTS: Alert[] = [
  {
    id: 'alt-1',
    type: 'sos',
    title: 'SOS Triggered - Sneha Desai',
    description: 'Active SOS near Grant Road Station. User has not moved for 5 minutes.',
    status: 'active',
    location: 'Grant Road, Mumbai',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    severity: 'critical'
  },
  {
    id: 'alt-2',
    type: 'incident',
    title: 'High Severity Incident Reported',
    description: 'Group of men loitering near unlit pathway.',
    status: 'active',
    location: 'Tardeo Alley, Mumbai',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    severity: 'high'
  }
];

function initDB() {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(INITIAL_ALERTS, null, 2));
  }
}

export function loadAlerts(): Alert[] {
  initDB();
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(data) as any[];
    return parsed.map(alert => ({
      ...alert,
      createdAt: alert.createdAt || alert.timestamp || new Date().toISOString(),
      updatedAt: alert.updatedAt || alert.timestamp || new Date().toISOString(),
    })) as Alert[];
  } catch (error) {
    console.error('Failed to load alerts:', error);
    return [];
  }
}

export function saveAlerts(alerts: Alert[]) {
  initDB();
  try {
    fs.writeFileSync(dbPath, JSON.stringify(alerts, null, 2));
  } catch (error) {
    console.error('Failed to save alerts:', error);
  }
}

/**
 * GeoJSON Point representation following standard RFC 7946:
 * coordinates format: [longitude, latitude]
 */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export function validateCoordinates(lat: unknown, lng: unknown): { isValid: boolean; error?: string } {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { isValid: false, error: 'Latitude and longitude must be numbers' };
  }
  if (isNaN(lat) || isNaN(lng)) {
    return { isValid: false, error: 'Coordinates cannot be NaN' };
  }
  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90' };
  }
  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180' };
  }
  return { isValid: true };
}

export function createGeoPoint(lat: number, lng: number): GeoPoint {
  return {
    type: 'Point',
    coordinates: [lng, lat], // GeoJSON order: [longitude, latitude]
  };
}

// 1. User Model
export interface UserDocument {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'guardian' | 'admin';
  emergencyContacts?: Array<{
    id: string;
    name: string;
    phone: string;
  }>;
  emergencyPreferences?: {
    shareLiveLocation?: boolean;
    autoRecordAudio?: boolean;
    notifyContacts?: boolean;
  };
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

// 2. Guardian Model
export interface GuardianDocument {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  orgType: 'ngo' | 'community' | 'law_enforcement' | 'medical' | 'independent';
  organization: string;
  areaOfOperation: string;
  assignedRegion?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verified: boolean;
  location?: GeoPoint;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

// 3. Incident Model
export interface IncidentDocument {
  id: string;
  category: string;
  severity: number; // 1-100
  description?: string;
  location: GeoPoint;
  lat: number;
  lng: number;
  occurredAt: string; // ISO 8601 UTC
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  isAnonymous: boolean;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ASSIGNED' | 'RESOLVED' | 'ESCALATED';
  confidence: number; // 1-100
  photoUrl?: string;
  photoStorageKey?: string;
  photoMimeType?: string;
  photoSize?: number;
  photoUploadedAt?: string;
  assignedGuardianId?: string;
  timeline: Array<{
    action: string;
    timestamp: string;
    note?: string;
    actor?: string;
  }>;
}

// 4. Alert Model
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'acknowledged' | 'assigned' | 'escalated' | 'resolved';
export type AlertType = 'sos' | 'incident' | 'system';

export interface AlertDocument {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  status: AlertStatus;
  location?: string;
  geo?: GeoPoint;
  lat?: number;
  lng?: number;
  severity: AlertSeverity;
  userId?: string;
  assignedGuardianId?: string;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  acknowledgedAt?: string;
  assignedAt?: string;
  escalatedAt?: string;
  resolvedAt?: string;
}

// Upload Document for persistent photo storage in hosted MongoDB
export interface UploadDocument {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data: string; // Base64 encoded binary data
  uploadedAt: string; // ISO 8601 UTC
}

// 5. Journey Model
export interface JourneyDocument {
  id: string;
  userId: string;
  userName?: string;
  status: 'active' | 'completed' | 'cancelled';
  currentLocation: GeoPoint;
  destination?: {
    lat: number;
    lng: number;
    address?: string;
  };
  eta?: string;
  routeScore?: number;
  consentGranted: boolean;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  lastUpdate: string; // ISO 8601 UTC
}

// 6. JourneyLocation Model (Breadcrumb Tracking)
export interface JourneyLocationDocument {
  id: string;
  journeyId: string;
  userId: string;
  location: GeoPoint;
  speed?: number;
  heading?: number;
  timestamp: string; // ISO 8601 UTC
}

// 7. CaseNote Model
export interface CaseNoteDocument {
  id: string;
  reportId: string; // incident id
  guardianId?: string;
  guardianName?: string;
  note: string;
  action?: string;
  createdAt: string; // ISO 8601 UTC
}

// 8. AuditLog Model
export interface AuditLogDocument {
  id: string;
  action: string;
  entityType: 'incident' | 'alert' | 'journey' | 'guardian' | 'user';
  entityId: string;
  actor: string;
  details?: Record<string, any>;
  timestamp: string; // ISO 8601 UTC
}

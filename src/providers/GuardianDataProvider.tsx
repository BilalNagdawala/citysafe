'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEMO_NGOS } from '@/lib/demo-data';
import { parseLatLng } from '@/lib/geo-utils';

export interface GuardianReportItem {
  id: string;
  type: string;
  location: string;
  coordinates: { lat: number; lng: number };
  time: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  evidence: boolean;
  imageUrl?: string;
  verificationStatus: 'Verified' | 'Unverified';
  status: 'New' | 'Assigned' | 'Resolved' | 'Escalated' | 'Verified';
  assignedOrg: string | null;
  timeline: Array<{ action: string; timestamp: string; note?: string; actor?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuardianCaseItem {
  id: string;
  reportId: string;
  title: string;
  incident: string;
  location: string;
  assignedGuardian: string;
  partnerNgo: string;
  status: 'Assigned' | 'In Progress' | 'Resolved' | 'Escalated' | 'Open';
  assignedTo: string;
  priority: 'High' | 'Medium' | 'Low';
  lastActivity: string;
  notesCount: number;
}

export interface GuardianJourneyItem {
  id: string;
  userId: string;
  userName?: string;
  status: 'active' | 'completed' | 'cancelled';
  currentLocation: {
    lat: number;
    lng: number;
    accuracy?: number;
    updatedAt?: string;
  } | null;
  destination?: {
    lat: number;
    lng: number;
    address?: string;
  };
  eta?: string;
  routeScore?: number;
  consentGranted: boolean;
  lastUpdate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GuardianDataProps {
  reports: GuardianReportItem[];
  cases: GuardianCaseItem[];
  alerts: any[];
  journeys: GuardianJourneyItem[];
  ngos: typeof DEMO_NGOS;
  guardians: any[];
  resolveReport: (id: string, note?: string) => Promise<void>;
  assignCase: (id: string, guardianName?: string) => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  profile: any | null;
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

const GuardianDataContext = createContext<GuardianDataProps | undefined>(undefined);

export function GuardianDataProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<GuardianReportItem[]>([]);
  const [cases, setCases] = useState<GuardianCaseItem[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [journeys, setJourneys] = useState<GuardianJourneyItem[]>([]);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [ngos] = useState(DEMO_NGOS);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mapIncidentToReport = (inc: any): GuardianReportItem => {
    const sevNum = typeof inc.severity === 'number' ? inc.severity : 50;
    const severityStr: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
      sevNum >= 80 ? 'CRITICAL' : sevNum >= 50 ? 'HIGH' : sevNum >= 25 ? 'MEDIUM' : 'LOW';

    let displayStatus: 'New' | 'Assigned' | 'Resolved' | 'Escalated' | 'Verified' = 'New';
    if (inc.status === 'RESOLVED') displayStatus = 'Resolved';
    else if (inc.status === 'ASSIGNED') displayStatus = 'Assigned';
    else if (inc.status === 'ESCALATED') displayStatus = 'Escalated';
    else if (inc.status === 'VERIFIED') displayStatus = 'Verified';

    return {
      id: inc.id,
      type: inc.category || 'Incident',
      location: inc.description ? inc.description.slice(0, 60) : 'Reported Location',
      coordinates: {
        lat: inc.lat ?? (inc.location?.coordinates ? inc.location.coordinates[1] : 18.969),
        lng: inc.lng ?? (inc.location?.coordinates ? inc.location.coordinates[0] : 72.819),
      },
      time: inc.occurredAt || inc.createdAt || new Date().toISOString(),
      severity: severityStr,
      description: inc.description || 'No description provided.',
      evidence: Boolean(inc.photoUrl),
      imageUrl: inc.photoUrl || undefined,
      verificationStatus: inc.status === 'VERIFIED' ? 'Verified' : 'Unverified',
      status: displayStatus,
      assignedOrg: inc.assignedGuardianId || null,
      timeline: inc.timeline || [],
      createdAt: inc.createdAt,
      updatedAt: inc.updatedAt,
    };
  };

  const mapReportsToCases = (reportItems: GuardianReportItem[]): GuardianCaseItem[] => {
    return reportItems
      .filter((r) => r.status === 'Assigned' || r.status === 'Escalated' || r.status === 'Verified')
      .map((r, idx) => ({
        id: `CASE-2026-${100 + idx}`,
        reportId: r.id,
        title: `${r.type} Response`,
        incident: `${r.type} Incident`,
        location: r.location,
        assignedGuardian: r.assignedOrg || 'Rapid Response Unit',
        partnerNgo: 'Community Shield Foundation',
        status: r.status === 'Assigned' ? 'In Progress' : 'Open',
        assignedTo: r.assignedOrg || 'Rapid Response Unit',
        priority: r.severity === 'CRITICAL' ? 'High' : r.severity === 'HIGH' ? 'Medium' : 'Low',
        lastActivity: r.updatedAt || r.time,
        notesCount: r.timeline ? r.timeline.length : 1,
      }));
  };

  const refreshData = useCallback(async () => {
    try {
      const [mapRes, guardiansRes] = await Promise.all([
        fetch('/api/guardian/map-data'),
        fetch('/api/guardians'),
      ]);

      if (mapRes.ok) {
        const data = await mapRes.json();

        if (Array.isArray(data.incidents)) {
          const mappedReports = data.incidents.map(mapIncidentToReport);
          setReports(mappedReports);
          setCases(mapReportsToCases(mappedReports));
        }

        if (Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        }

        if (Array.isArray(data.journeys)) {
          const normalizedJourneys: GuardianJourneyItem[] = data.journeys.map((j: any) => {
            const loc = parseLatLng(j.currentLocation);
            return {
              ...j,
              currentLocation: loc
                ? {
                    lat: loc.lat,
                    lng: loc.lng,
                    accuracy: loc.accuracy,
                    updatedAt: loc.updatedAt || j.lastUpdate || j.updatedAt || new Date().toISOString(),
                  }
                : null,
            };
          });
          setJourneys(normalizedJourneys);
        }
      }

      if (guardiansRes.ok) {
        const gData = await guardiansRes.json();
        if (Array.isArray(gData.guardians)) {
          setGuardians(gData.guardians);
          if (gData.guardians.length > 0 && !profile) {
            setProfile(gData.guardians[0]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to refresh guardian data from MongoDB:', e);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000); // 10s poll
    return () => clearInterval(interval);
  }, [refreshData]);

  const resolveReport = async (id: string, note?: string) => {
    // Optimistic UI update
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Resolved' } : r))
    );

    try {
      await fetch(`/api/guardian/reports/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE',
          note: note || 'Resolved by Guardian in Command Center',
        }),
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to resolve report in database:', e);
    }
  };

  const assignCase = async (id: string, guardianName?: string) => {
    // Optimistic UI update
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Assigned' } : r))
    );

    try {
      await fetch(`/api/guardian/reports/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN',
          note: `Assigned to ${guardianName || 'Guardian'}`,
        }),
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to assign report in database:', e);
    }
  };

  const acknowledgeAlert = async (id: string) => {
    // Optimistic UI update
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' } : a))
    );

    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'acknowledged' }),
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to acknowledge alert in database:', e);
    }
  };

  return (
    <GuardianDataContext.Provider
      value={{
        reports,
        cases,
        alerts,
        journeys,
        guardians,
        ngos,
        resolveReport,
        assignCase,
        acknowledgeAlert,
        profile,
        refreshData,
        isLoading,
      }}
    >
      {children}
    </GuardianDataContext.Provider>
  );
}

export function useGuardianData() {
  const context = useContext(GuardianDataContext);
  if (context === undefined) {
    throw new Error('useGuardianData must be used within a GuardianDataProvider');
  }
  return context;
}

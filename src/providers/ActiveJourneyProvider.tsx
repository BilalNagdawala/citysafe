'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Route } from '@/lib/osrm';
import { RouteScore } from '@/lib/safety';

export interface ActiveJourney {
  id: string;
  status: 'active' | 'paused' | 'ended';
  origin: [number, number] | null; // [lng, lat]
  destination: [number, number] | null; // [lng, lat]
  destinationAddress?: string;
  routes: Route[];
  routeScores: RouteScore[];
  selectedRouteIndex: number;
  etaMinutes: number;
  safetyScore: number;
  isShared: boolean;
  startedAt: string;
  lastUpdated: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

export interface StartJourneyParams {
  id?: string;
  origin: [number, number];
  destination: [number, number];
  destinationAddress?: string;
  routes?: Route[];
  routeScores?: RouteScore[];
  selectedRouteIndex?: number;
  etaMinutes?: number;
  safetyScore?: number;
}

interface ActiveJourneyContextType {
  activeJourney: ActiveJourney | null;
  isInitialized: boolean;
  startJourney: (params: StartJourneyParams) => string;
  pauseJourney: () => Promise<void>;
  resumeJourney: () => Promise<void>;
  endJourney: () => Promise<void>;
  shareJourney: () => Promise<boolean>;
  updateLocation: (lat: number, lng: number) => void;
}

const STORAGE_KEY = 'citysafe_active_journey';

const ActiveJourneyContext = createContext<ActiveJourneyContextType | undefined>(undefined);

export function ActiveJourneyProvider({ children }: { children: React.ReactNode }) {
  const [activeJourney, setActiveJourney] = useState<ActiveJourney | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSyncRef = useRef<number>(0);

  // 1. Initialize from localStorage on mount (preserves journey on page refresh)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.status === 'active' || parsed.status === 'paused')) {
          setActiveJourney(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to parse stored active journey:', err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // 2. Persist state changes to localStorage
  const saveJourney = useCallback((journey: ActiveJourney | null) => {
    setActiveJourney(journey);
    try {
      if (journey && journey.status !== 'ended') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(journey));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to save active journey to localStorage:', err);
    }
  }, []);

  // 3. Start a new journey
  const startJourney = useCallback((params: StartJourneyParams): string => {
    const journeyId = params.id || `jny-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const routes = params.routes || [];
    const routeScores = params.routeScores || [];
    const selectedIdx = params.selectedRouteIndex ?? 0;
    const selectedRoute = routes[selectedIdx];
    const selectedScore = routeScores[selectedIdx];

    const eta = params.etaMinutes ?? (selectedRoute ? Math.round(selectedRoute.duration / 60) : 15);
    const score = params.safetyScore ?? (selectedScore ? selectedScore.safetyScore : 85);

    const newJourney: ActiveJourney = {
      id: journeyId,
      status: 'active',
      origin: params.origin,
      destination: params.destination,
      destinationAddress: params.destinationAddress || 'Destination',
      routes,
      routeScores,
      selectedRouteIndex: selectedIdx,
      etaMinutes: eta,
      safetyScore: score,
      isShared: false,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      currentLocation: {
        lat: params.origin[1],
        lng: params.origin[0],
      },
    };

    saveJourney(newJourney);

    // Sync to MongoDB in background
    fetch(`/api/journeys/${journeyId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: params.origin[1],
        lng: params.origin[0],
        status: 'active',
        destination: {
          lat: params.destination[1],
          lng: params.destination[0],
          address: params.destinationAddress || 'Destination',
        },
        routeScore: score,
      }),
    }).catch(err => {
      console.warn('Initial journey sync failed:', err);
    });

    return journeyId;
  }, [saveJourney]);

  // 4. Pause journey
  const pauseJourney = useCallback(async () => {
    if (!activeJourney) return;
    const updated: ActiveJourney = {
      ...activeJourney,
      status: 'paused',
      lastUpdated: new Date().toISOString(),
    };
    saveJourney(updated);

    try {
      await fetch(`/api/journeys/${activeJourney.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
    } catch (err) {
      console.warn('Failed to update paused journey in DB:', err);
    }
  }, [activeJourney, saveJourney]);

  // 5. Resume journey
  const resumeJourney = useCallback(async () => {
    if (!activeJourney) return;
    const updated: ActiveJourney = {
      ...activeJourney,
      status: 'active',
      lastUpdated: new Date().toISOString(),
    };
    saveJourney(updated);

    try {
      await fetch(`/api/journeys/${activeJourney.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
    } catch (err) {
      console.warn('Failed to update active journey in DB:', err);
    }
  }, [activeJourney, saveJourney]);

  // 6. End journey
  const endJourney = useCallback(async () => {
    if (!activeJourney) return;
    const id = activeJourney.id;
    saveJourney(null);

    try {
      await fetch(`/api/journeys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
    } catch (err) {
      console.warn('Failed to complete journey in DB:', err);
    }
  }, [activeJourney, saveJourney]);

  // 7. Share journey
  const shareJourney = useCallback(async (): Promise<boolean> => {
    if (!activeJourney) return false;
    const url = typeof window !== 'undefined' ? `${window.location.origin}/active-journey` : '';
    const shareText = `Track my live journey on CitySafe AI to ${activeJourney.destinationAddress || 'my destination'}. ETA: ${activeJourney.etaMinutes} min • Safety: ${activeJourney.safetyScore}/100.`;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'Live Journey Tracking - CitySafe AI',
          text: shareText,
          url,
        });
        const updated: ActiveJourney = { ...activeJourney, isShared: true };
        saveJourney(updated);
        return true;
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${url}`);
        alert('Live journey tracking link copied to clipboard!');
        const updated: ActiveJourney = { ...activeJourney, isShared: true };
        saveJourney(updated);
        return true;
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('Share error:', e);
      }
    }
    return false;
  }, [activeJourney, saveJourney]);

  // 8. Update location and periodic DB sync
  const updateLocation = useCallback((lat: number, lng: number) => {
    if (!activeJourney || activeJourney.status !== 'active') return;

    const now = Date.now();
    const updated: ActiveJourney = {
      ...activeJourney,
      currentLocation: { lat, lng },
      lastUpdated: new Date().toISOString(),
    };
    saveJourney(updated);

    // Throttle DB updates to once every 10 seconds
    if (now - lastSyncRef.current > 10000) {
      lastSyncRef.current = now;
      fetch(`/api/journeys/${activeJourney.id}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          status: 'active',
          destination: activeJourney.destination
            ? {
                lat: activeJourney.destination[1],
                lng: activeJourney.destination[0],
                address: activeJourney.destinationAddress,
              }
            : undefined,
          routeScore: activeJourney.safetyScore,
        }),
      }).catch(err => {
        console.warn('Periodic journey location sync failed:', err);
      });
    }
  }, [activeJourney, saveJourney]);

  return (
    <ActiveJourneyContext.Provider
      value={{
        activeJourney,
        isInitialized,
        startJourney,
        pauseJourney,
        resumeJourney,
        endJourney,
        shareJourney,
        updateLocation,
      }}
    >
      {children}
    </ActiveJourneyContext.Provider>
  );
}

export function useActiveJourney() {
  const context = useContext(ActiveJourneyContext);
  if (!context) {
    throw new Error('useActiveJourney must be used within an ActiveJourneyProvider');
  }
  return context;
}

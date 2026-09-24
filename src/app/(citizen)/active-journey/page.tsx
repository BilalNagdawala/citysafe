"use client";

import dynamic from "next/dynamic";
import { ChevronLeft, Share2, AlertTriangle, ShieldCheck, Navigation, MapPin } from "lucide-react";
import Link from "next/link";
import SOSButton from "@/components/SOSButton";
import { useEffect, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useActiveJourney } from "@/providers/ActiveJourneyProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Suspense } from "react";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

function ActiveJourneyContent() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { activeJourney, isInitialized, pauseJourney, resumeJourney, endJourney, shareJourney, updateLocation } = useActiveJourney();
  const isTracking = activeJourney?.status === 'active';
  const { coordinates, isLoading: isGeoLoading, error: geoError } = useGeolocation(isTracking);

  // If context is initialized and no active journey exists, redirect immediately to Home
  useEffect(() => {
    if (isInitialized && (!activeJourney || activeJourney.status === 'ended')) {
      router.replace('/');
    }
  }, [isInitialized, activeJourney, router]);

  // Update current live location in active journey state and MongoDB
  useEffect(() => {
    if (coordinates && activeJourney && activeJourney.status === 'active') {
      updateLocation(coordinates[1], coordinates[0]);
    }
  }, [coordinates, activeJourney, updateLocation]);

  if (!isInitialized || !activeJourney || activeJourney.status === 'ended') {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-900 gap-3">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-semibold text-muted-fg">Loading active journey...</p>
      </div>
    );
  }

  const liveOrigin = coordinates || activeJourney.origin;
  const destination = activeJourney.destination;
  const currentScore = activeJourney.routeScores[activeJourney.selectedRouteIndex] || activeJourney.routeScores[0];
  const currentRoute = activeJourney.routes[activeJourney.selectedRouteIndex] || activeJourney.routes[0];

  return (
    <main className="flex-1 relative h-[100dvh] w-full bg-slate-50 dark:bg-zinc-900 overflow-hidden flex flex-col md:flex-row">
      {/* Map Container */}
      <motion.div 
        className="absolute inset-0 md:relative md:flex-1 z-0 bg-slate-100 dark:bg-zinc-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Map 
          routes={activeJourney.routes}
          routeScores={activeJourney.routeScores}
          selectedRouteIndex={activeJourney.selectedRouteIndex}
          origin={liveOrigin || undefined}
          destination={destination || undefined}
        />
      </motion.div>

      {/* Active Journey Live Panel */}
      <BottomSheet defaultExpanded={true}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pt-4 md:pt-0">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 rounded-full hover:bg-muted transition-colors text-foreground -ml-2 bg-card border border-border shadow-xs"
              title="Return to Home (Journey remains active)"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-foreground">Live Journey</h1>
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${activeJourney.status === 'active' ? 'text-primary' : 'text-warning'}`}>
                <span className={`w-2 h-2 rounded-full ${activeJourney.status === 'active' ? 'bg-primary animate-pulse' : 'bg-warning'}`} />
                {activeJourney.status === 'active' 
                  ? (activeJourney.isShared ? 'Tracking Active • Location Shared' : 'Tracking Active • In Progress') 
                  : 'Journey Paused'}
              </span>
            </div>
          </div>

          <button 
            onClick={() => shareJourney()}
            className="p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Share live journey"
          >
            <Share2 size={18} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Destination & ETA Dashboard */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-5 bg-card/60 border border-border/80 rounded-2xl p-4">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-fg mb-1">
              <MapPin size={13} className="text-primary" />
              <span>Destination</span>
            </div>
            <h2 className="text-base font-bold text-foreground leading-snug truncate max-w-[260px]">
              {activeJourney.destinationAddress || 'Destination Point'}
            </h2>
            <div className="mt-1 text-2xl font-black text-foreground">
              {activeJourney.etaMinutes} min <span className="text-xs font-semibold text-muted-fg">remaining</span>
            </div>
          </div>
          
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-xs font-bold text-muted-fg mb-1">Route Safety</span>
            <span className="bg-card text-foreground px-3 py-1.5 rounded-xl text-sm font-black border border-border shadow-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              {activeJourney.safetyScore}/100
            </span>
          </div>
        </div>

        {/* Warning / Safety Notice */}
        <div className="flex items-center gap-3 bg-card border-l-4 border-l-warning border-y border-r border-border shadow-xs p-3.5 rounded-xl mb-5">
          <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-warning shrink-0" size={18} />
          </div>
          <div className="text-xs">
            <p className="font-bold text-foreground">Live Safety Corridor Active</p>
            <p className="font-medium text-muted-fg">Emergency guardians and automated check-ins monitoring route.</p>
          </div>
        </div>

        {/* Action Controls: Pause, Resume, End, SOS */}
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="wait">
            {activeJourney.status === 'active' ? (
              <motion.button 
                key="pause-btn"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                onClick={pauseJourney}
                className="w-full bg-warning text-warning-fg font-bold p-3.5 min-h-[50px] rounded-2xl flex justify-center items-center hover:bg-warning/90 active:scale-95 transition-all shadow-md text-sm tracking-wide"
              >
                PAUSE JOURNEY
              </motion.button>
            ) : (
              <motion.div 
                key="resume-end-controls"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                className="flex gap-3"
              >
                <button 
                  onClick={resumeJourney}
                  className="flex-1 bg-primary text-primary-fg font-bold p-3.5 min-h-[50px] rounded-2xl flex justify-center items-center hover:bg-primary/90 active:scale-95 transition-all shadow-md text-sm tracking-wide"
                >
                  RESUME
                </button>
                <button 
                  onClick={async () => {
                    await endJourney();
                    router.push('/');
                  }}
                  className="flex-1 bg-danger/10 text-danger border border-danger/20 font-bold p-3.5 min-h-[50px] rounded-2xl flex justify-center items-center hover:bg-danger/20 active:scale-95 transition-all text-sm tracking-wide"
                >
                  END JOURNEY
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="pt-2 pb-4">
            <SOSButton />
          </div>
        </div>
      </BottomSheet>
    </main>
  );
}

export default function ActiveJourneyPage() {
  return (
    <Suspense 
      fallback={
        <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-50 dark:bg-zinc-900">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <ActiveJourneyContent />
    </Suspense>
  );
}

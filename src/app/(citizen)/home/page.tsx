'use client';

import Link from 'next/link';
import { Shield, Navigation, Search, Map as MapIcon, Route as RouteIcon, Info, MapPin } from 'lucide-react';
import SOSButton from '@/components/SOSButton';
import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/ui/GlassCard';
import { Loader2, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SafetyScore } from '@/components/ui/SafetyScore';
import RoleGuard from '@/components/RoleGuard';
import { useActiveJourney } from '@/providers/ActiveJourneyProvider';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  )
});

export default function Dashboard() {
  const { coordinates, isLoading, error, isDemo, locationName, useDemoLocation, retryLocation } = useGeolocation();
  const { activeJourney } = useActiveJourney();
  const prefersReducedMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const bgVariants: any = {
    hidden: { scale: prefersReducedMotion ? 1 : 1.05, opacity: 0 },
    visible: { scale: 1, opacity: 0.1, transition: { duration: 1.5, ease: "easeOut" } }
  };

  return (
    <RoleGuard allowedRoles={['user']}>
    <main className="h-full w-full relative overflow-hidden bg-[--background]">
      
      {/* Hero Background */}
      <motion.div 
        className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1572005436666-4c47551ab9c5?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center dark:opacity-5 mix-blend-luminosity md:hidden"
        initial="hidden"
        animate="visible"
        variants={bgVariants}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[--background] via-[--background]/80 to-[--background]/40 pointer-events-none z-10" />
      </motion.div>

      {/* Main Layout */}
      <div className="absolute inset-0 flex flex-col md:flex-row w-full h-full">
        
        {/* Left Column (Center Command Panel on Desktop, Bottom Panel on Mobile) */}
        <motion.div 
          className="z-20 pointer-events-none absolute inset-x-0 bottom-0 h-auto pb-[calc(80px+env(safe-area-inset-bottom))] p-4
            md:relative md:inset-auto md:w-[420px] md:h-full md:pb-6 md:p-6 md:bg-card md:border-r md:border-[--border] md:shadow-lg
            flex flex-col justify-end md:justify-start shrink-0 overflow-y-auto hide-scrollbar"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="pointer-events-auto w-full flex flex-col gap-4 max-w-md mx-auto md:max-w-full md:h-full md:pt-2">
            
            {/* Active Journey Banner on Home (Only shown when journey is active/paused) */}
            {activeJourney && (activeJourney.status === 'active' || activeJourney.status === 'paused') && (
              <motion.div 
                variants={itemVariants}
                className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-4 shadow-sm relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${activeJourney.status === 'active' ? 'bg-primary animate-pulse' : 'bg-warning'}`} />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                      {activeJourney.status === 'active' ? 'Active Journey in Progress' : 'Journey Paused'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-foreground bg-[--background] border border-[--border] px-2.5 py-1 rounded-lg">
                    {activeJourney.safetyScore}/100 Safe
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      To {activeJourney.destinationAddress || 'Destination'}
                    </p>
                    <p className="text-xs text-muted-fg font-medium mt-0.5">
                      {activeJourney.etaMinutes} min remaining · Live GPS tracking
                    </p>
                  </div>

                  <Link
                    href="/active-journey"
                    className="px-4 py-2 bg-primary text-primary-fg text-xs font-bold rounded-xl shadow-xs hover:bg-primary/90 active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
                  >
                    <span>View Journey</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="hidden md:flex flex-col mb-2">
               <h2 className="text-3xl font-bold mb-1 text-foreground tracking-tight">Good evening,</h2>
               <p className="text-sm text-muted-fg font-medium">Ready to head out safely?</p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GlassCard className="!p-5 shadow-xl md:shadow-none overflow-hidden relative border border-[--glass-border] md:border-[--border] md:bg-transparent md:backdrop-blur-none">
                <h2 className="text-2xl font-bold mb-1 text-foreground tracking-tight md:hidden">Good evening,</h2>
                
                <div className="mb-5 flex flex-col gap-3">
                  {isLoading && (
                    <div className="flex items-center gap-2 text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Finding your location...</span>
                    </div>
                  )}
                  {error && (
                    <div className="flex flex-col gap-2 bg-danger/10 p-3 rounded-lg border border-danger/20">
                      <div className="flex items-center gap-2 text-danger">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={retryLocation} className="text-xs bg-[--background] text-foreground border border-[--border] px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-transform hover:bg-muted">
                          <RefreshCw className="w-3 h-3" /> Try Again
                        </button>
                        <button onClick={useDemoLocation} className="text-xs bg-primary text-primary-fg px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                          Use Demo Location
                        </button>
                      </div>
                    </div>
                  )}
                  {coordinates && (
                    <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border border-[--border] self-start">
                      <MapIcon className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground font-semibold">
                        {locationName || "Current Location"}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider ml-2 ${isDemo ? 'bg-warning/20 text-warning-fg' : 'bg-primary/20 text-primary-fg'}`}>
                        {isDemo ? 'Demo' : 'GPS'}
                      </span>
                    </div>
                  )}
                </div>
                
                <Link href="/route" className="block mb-4">
                  <div className="bg-[--background] rounded-2xl p-5 flex items-center gap-4 border-2 border-[--border] hover:border-primary/50 focus-within:border-primary transition-all cursor-text group shadow-sm">
                    <Search className="w-6 h-6 text-muted-fg group-hover:text-primary transition-colors" />
                    <span className="text-lg font-bold text-muted-fg flex-1">Where are you going?</span>
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-fg transition-transform group-hover:scale-105 shadow-sm">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </Link>

                <div className="flex flex-row gap-3">
                  <Link href="/route" className="flex-1 block outline-none">
                    <motion.button 
                      whileHover={prefersReducedMotion ? {} : { y: -2 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      className="w-full h-full text-left bg-[--background] border border-[--border] hover:border-primary/30 rounded-xl p-4 transition-all group focus:ring-2 focus:ring-primary/20 outline-none shadow-sm hover:shadow"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <RouteIcon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1">Find Safer Route</h3>
                      <p className="text-[11px] text-muted-fg font-medium leading-tight">Compare safe options</p>
                    </motion.button>
                  </Link>

                  {activeJourney && (activeJourney.status === 'active' || activeJourney.status === 'paused') ? (
                    <Link href="/active-journey" className="flex-1 block outline-none">
                      <motion.button 
                        whileHover={prefersReducedMotion ? {} : { y: -2 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                        className="w-full h-full text-left bg-primary/5 border border-primary/30 hover:border-primary/50 rounded-xl p-4 transition-all group focus:ring-2 focus:ring-primary/20 outline-none shadow-sm hover:shadow"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mb-3">
                          <Navigation className="w-5 h-5 text-primary group-hover:scale-110 transition-transform animate-pulse" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground mb-1">Active Journey</h3>
                        <p className="text-[11px] text-primary font-medium leading-tight">Live trip in progress</p>
                      </motion.button>
                    </Link>
                  ) : (
                    <Link href="/explore" className="flex-1 block outline-none">
                      <motion.button 
                        whileHover={prefersReducedMotion ? {} : { y: -2 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                        className="w-full h-full text-left bg-[--background] border border-[--border] hover:border-primary/30 rounded-xl p-4 transition-all group focus:ring-2 focus:ring-primary/20 outline-none shadow-sm hover:shadow"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                          <MapIcon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground mb-1">Explore Map</h3>
                        <p className="text-[11px] text-muted-fg font-medium leading-tight">Live safety radar</p>
                      </motion.button>
                    </Link>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-4">
              <SOSButton inline={'home'} />
            </motion.div>

            {/* Area Safety Summary (Desktop) */}
            <motion.div variants={itemVariants} className="hidden md:flex flex-col mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-fg">Area Safety</h3>
                <Link href="/explore" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                  View Details <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="bg-[--background] rounded-xl p-4 border border-[--border] flex items-center gap-4">
                <SafetyScore score={82} size={56} strokeWidth={5} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground mb-1">Relatively Safe</p>
                  <p className="text-xs text-muted-fg leading-relaxed">
                    Good lighting and high activity in this area right now. Standard precautions advised.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Right Column Map (Desktop Only) */}
        <motion.div 
          className="hidden md:block flex-1 relative bg-[--background]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {isMounted && (
            <Map 
              routes={[]} 
              routeScores={[]} 
              selectedRouteIndex={null} 
              origin={coordinates || undefined}
            />
          )}
          
          {/* Floating Map Panel Overlay */}
          <div className="absolute top-6 right-6 z-20 pointer-events-none w-72">
            <div className="bg-card/90 backdrop-blur-xl border border-[--border] rounded-2xl p-4 shadow-xl pointer-events-auto">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold tracking-wider uppercase text-muted-fg">Live Map</span>
              </div>
              <h3 className="text-lg font-bold text-foreground leading-tight mb-1">{locationName ? locationName.split(',')[0] : "Locating..."}</h3>
              <p className="text-sm text-muted-fg mb-4 truncate">{locationName ? locationName.split(',').slice(1).join(',').trim() || "Finding area" : "Waiting for GPS"}</p>
              
              <div className="pt-3 border-t border-[--border] flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-fg">Local Time</span>
                  <span className="text-sm font-semibold text-foreground" suppressHydrationWarning>
                    {isMounted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-fg">Conditions</span>
                  <span className="text-sm font-semibold text-sage">Optimal</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </main>
    </RoleGuard>
  );
}

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ShieldAlert, Info, MapPin, Navigation, Search, Activity, Users, Loader2, X } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { searchPlaces, GeocodingResult } from '@/lib/geocoding';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ReportIncidentSheet } from '@/components/safety/ReportIncidentSheet';
import { AlertTriangle, Clock } from 'lucide-react';
import { calculateAreaSafetyScore, AreaScore } from '@/lib/safety';
import { useActiveJourney } from '@/providers/ActiveJourneyProvider';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-muted flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  )
});

export default function Explore() {
  const prefersReducedMotion = useReducedMotion();
  const { activeJourney } = useActiveJourney();
  const [activeTab, setActiveTab] = useState<'safety' | 'incidents'>('safety');
  const [showReportSheet, setShowReportSheet] = useState(false);
  
  const { coordinates, isLoading, error } = useGeolocation();
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState("Current Location");
  
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [areaScore, setAreaScore] = useState<AreaScore | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  const fetchAreaIncidents = async () => {
    const target = selectedLocation || coordinates;
    if (!target) return;
    setIsScoring(true);
    try {
      const [incRes, venRes] = await Promise.all([
        fetch(`/api/incidents?lat=${target[1]}&lng=${target[0]}&radius=5000`),
        fetch(`/api/nearby?lat=${target[1]}&lng=${target[0]}`)
      ]);
      
      let fetchedIncidents = [];
      let fetchedVenues = [];

      if (incRes.ok) {
        const data = await incRes.json();
        fetchedIncidents = data.incidents || [];
        setIncidents(fetchedIncidents);
      }
      
      if (venRes.ok) {
        const data = await venRes.json();
        fetchedVenues = data.venues || [];
        setVenues(fetchedVenues);
      }

      const targetTime = new Date();
      const newScore = calculateAreaSafetyScore(target[1], target[0], targetTime, fetchedIncidents, fetchedVenues);
      setAreaScore(newScore);
    } catch (e) {
      console.error("Failed to fetch area data:", e);
    } finally {
      setIsScoring(false);
    }
  };

  useEffect(() => {
    fetchAreaIncidents();
  }, [selectedLocation, coordinates]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 3 && showResults) {
        setIsSearching(true);
        try {
          const res = await searchPlaces(query);
          setResults(res);
        } catch (e) {
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, showResults]);

  const handleSelectLocation = (name: string, coords: [number, number]) => {
    setAreaScore(null);
    setSelectedLocation(coords);
    setLocationName(name);
    setQuery(name);
    setShowResults(false);
  };

  return (
    <main className="h-[100dvh] w-full flex flex-col md:flex-row relative overflow-hidden bg-slate-50 dark:bg-zinc-900 pb-20 md:pb-0">
      
      {/* Search Bar & Header Overlay (Mobile: Top, Desktop: Top-Left inside Canvas) */}
      <div className="absolute top-0 left-0 w-full z-20 p-4 pointer-events-none pt-[env(safe-area-inset-top)]">
        <header className="bg-card rounded-2xl px-5 py-3 border border-border shadow-md pointer-events-auto mx-auto md:mx-0 max-w-md w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <h1 className="text-sm font-bold tracking-tight">Explore Area</h1>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
          </div>
        </header>

        {/* Search Bar overlay */}
        <div className="mx-auto md:mx-0 max-w-md w-full mt-3 pointer-events-auto relative">
          <div className="bg-card p-3 rounded-2xl flex items-center gap-3 border border-border shadow-md focus-within:ring-2 ring-primary/20 transition-shadow min-h-[52px]">
            <Search className="w-5 h-5 text-muted-fg shrink-0" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search area to check safety..." 
              className="bg-transparent border-none outline-none w-full text-base font-medium placeholder:text-muted-fg text-foreground"
            />
            {query.length > 0 && (
              <button 
                onClick={() => {
                  setQuery('');
                  setShowResults(false);
                }}
                className="p-1 text-muted-fg hover:text-foreground bg-muted rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {isSearching && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
          </div>
          
          {/* Autocomplete Results */}
          {showResults && query.length >= 3 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20 max-h-60 overflow-y-auto">
              {results.length > 0 ? (
                results.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectLocation(res.name, res.coordinates)}
                    className="w-full text-left px-4 py-3 text-sm border-b border-border last:border-0 hover:bg-muted/50 flex items-center gap-3 text-foreground"
                  >
                    <MapPin size={16} className="text-muted-fg shrink-0" />
                    <span className="truncate font-medium">{res.displayName}</span>
                  </button>
                ))
              ) : (
                !isSearching && <div className="px-4 py-3 text-sm text-muted-fg font-medium">No results found</div>
              )}
            </div>
          )}

          {/* Floating Active Journey Chip */}
          {activeJourney && (activeJourney.status === 'active' || activeJourney.status === 'paused') && (
            <div className="mt-3 pointer-events-auto">
              <Link
                href="/active-journey"
                className="bg-card/95 backdrop-blur-md border-2 border-primary/40 p-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 group hover:border-primary transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${activeJourney.status === 'active' ? 'bg-primary animate-pulse' : 'bg-warning'} shrink-0`} />
                  <div className="truncate">
                    <p className="text-xs font-bold text-foreground truncate">
                      Active: {activeJourney.destinationAddress || 'Destination'}
                    </p>
                    <p className="text-[11px] text-muted-fg font-medium">
                      {activeJourney.etaMinutes} min remaining · {activeJourney.safetyScore}/100 Safe
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform flex items-center shrink-0">
                  View &rarr;
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Map Content (Right Canvas on Desktop, Full Screen on Mobile) */}
      <motion.div 
        className="absolute inset-0 md:relative md:inset-auto md:flex-1 z-0 bg-slate-100 dark:bg-zinc-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {!coordinates && !selectedLocation ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-3">
             {isLoading ? (
               <>
                 <Loader2 className="w-6 h-6 text-primary animate-spin" />
                 <p className="text-sm font-medium text-muted-fg">Acquiring GPS signal...</p>
               </>
             ) : error ? (
               <>
                 <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                   <ShieldAlert className="w-5 h-5 text-danger" />
                 </div>
                 <p className="text-sm font-bold text-danger">{error}</p>
                 <p className="text-xs text-muted-fg">Please enable location access or search manually.</p>
               </>
             ) : null}
          </div>
        ) : (
          <Map 
            routes={[]} 
            routeScores={[]} 
            selectedRouteIndex={null} 
            origin={(selectedLocation || coordinates)!}
            destination={undefined}
            incidents={incidents}
          />
        )}
      </motion.div>

      {/* Floating Info Sheet (Left Panel on Desktop, Bottom Sheet on Mobile) */}
      <BottomSheet defaultExpanded={true}>
        <div className="flex gap-2 p-1 bg-muted rounded-xl mb-6 mt-4 md:mt-0">
          <button 
            onClick={() => setActiveTab('safety')}
            className={clsx(
              "flex-1 text-xs font-bold py-2.5 rounded-lg transition-all",
              activeTab === 'safety' ? "bg-primary text-primary-fg shadow-md" : "bg-transparent text-muted-fg hover:text-foreground"
            )}
          >
            Safety Insights
          </button>
          <button 
            onClick={() => setActiveTab('incidents')}
            className={clsx(
              "flex-1 text-xs font-bold py-2.5 rounded-lg transition-all",
              activeTab === 'incidents' ? "bg-primary text-primary-fg shadow-md" : "bg-transparent text-muted-fg hover:text-foreground"
            )}
          >
            Reported Incidents
          </button>
        </div>

        <AnimatePresence mode="wait">
        {activeTab === 'safety' ? (
          <motion.div 
            key="safety"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-end justify-between">
              <div className="flex-1 overflow-hidden">
                <h2 className="text-2xl font-black text-foreground tracking-tight truncate pr-2">{locationName}</h2>
                <p className="text-sm font-medium text-muted-fg">Overall Area Score</p>
              </div>
              <div className="text-right shrink-0">
                {isScoring ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <span className={clsx(
                    "text-3xl font-black leading-none tracking-tighter",
                    areaScore?.safetyScore && areaScore.safetyScore >= 75 ? "text-primary" : 
                    areaScore?.safetyScore && areaScore.safetyScore >= 50 ? "text-warning" : "text-danger"
                  )}>
                    {areaScore?.safetyScore || '--'}
                    <span className="text-lg text-muted-fg">/100</span>
                  </span>
                )}
              </div>
            </div>
            
            {areaScore && (
              <StatusPill 
                status={areaScore.riskLevel === 'LOW' ? 'safe' : areaScore.riskLevel === 'MODERATE' ? 'warning' : 'danger'} 
                className="w-fit mb-2"
              >
                {areaScore.riskLevel === 'LOW' ? 'Relatively Safe' : areaScore.riskLevel === 'MODERATE' ? 'Moderate Risk' : 'High Risk Area'}
              </StatusPill>
            )}
            
            <div className="grid grid-cols-1 gap-3">
              {areaScore ? areaScore.factors.slice(0, 4).map((factor, idx) => (
                <div key={idx} className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-start gap-3">
                  {factor.type === 'positive' ? (
                    <Activity className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  ) : factor.type === 'negative' ? (
                    <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-5 h-5 text-muted-fg shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm font-medium text-foreground leading-snug">{factor.reason}</p>
                </div>
              )) : (
                <div className="col-span-2 text-center py-6 text-sm text-muted-fg flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Calculating real-time safety score...
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="incidents"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-foreground">Recent Reports</h3>
              <button 
                onClick={() => setShowReportSheet(true)}
                className="text-xs bg-danger/10 text-danger font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-danger/20 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" /> Report
              </button>
            </div>

            {incidents.length === 0 ? (
              <div className="text-sm text-muted-fg font-medium py-4 text-center">No recent incidents reported in this area.</div>
            ) : (
              incidents.map((incident, idx) => {
                const isHigh = incident.severity === 'high';
                const borderColor = isHigh ? 'border-l-danger' : 'border-l-warning';
                const bgIcon = isHigh ? 'bg-danger/10' : 'bg-warning/10';
                const textIcon = isHigh ? 'text-danger' : 'text-warning';
                const timeAgo = new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={`inc-${incident.id || idx}`} className={`bg-card p-4 rounded-xl border-l-4 ${borderColor} border-y border-r border-border shadow-sm`}>
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full ${bgIcon} flex items-center justify-center shrink-0`}>
                        <ShieldAlert className={`w-4 h-4 ${textIcon}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-foreground mb-1">{incident.category}</h4>
                        <p className="text-xs text-muted-fg font-medium mb-2">{incident.description}</p>
                        {incident.imageUrl && (
                          <div className="mb-2 w-full h-32 rounded-lg overflow-hidden border border-border">
                            <img src={incident.imageUrl} alt="Incident" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </BottomSheet>

      {showReportSheet && (
        <ReportIncidentSheet 
          onClose={() => setShowReportSheet(false)} 
          onSuccess={() => {
            fetchAreaIncidents();
          }} 
        />
      )}
    </main>
  );
}

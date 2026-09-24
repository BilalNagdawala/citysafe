"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert,
  Search, 
  ChevronLeft, 
  Target,
  RotateCcw,
  Clock,
  Info,
  X
} from "lucide-react";
import { getThreeDistinctRoutes, Route } from "@/lib/osrm";
import { 
  categorizeThreeRoutes, 
  CategorizedRoute, 
  formatDuration 
} from "@/lib/route-options";
import { RouteScore } from "@/lib/safety";
import { searchPlaces, GeocodingResult } from "@/lib/geocoding";
import { useGeolocation } from "@/hooks/useGeolocation";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import SOSButton from "@/components/SOSButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useActiveJourney } from "@/providers/ActiveJourneyProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SafetyScore } from "@/components/ui/SafetyScore";
import { StatusPill } from "@/components/ui/StatusPill";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassButton } from "@/components/ui/GlassButton";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import FiveMinuteTimePicker, { 
  roundToNearestFiveMinutes, 
  formatTime12h 
} from "@/components/safety/FiveMinuteTimePicker";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-muted flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  )
});

// Demo fallback options for empty search state
const DEMO_DESTINATIONS = [
  { name: "Bandra West, Mumbai", coords: [72.8347, 19.0596] as [number, number] },
  { name: "Juhu Beach, Mumbai", coords: [72.8267, 19.1048] as [number, number] },
  { name: "Powai Lake, Mumbai", coords: [72.9051, 19.1286] as [number, number] },
];

interface RouteErrorState {
  title: string;
  message: string;
  canRetry: boolean;
}

export default function RoutePlanning() {
  const prefersReducedMotion = useReducedMotion();
  const sharingRef = useRef(false);

  // Time state: strictly 5-minute interval timezone-aware Date
  const [selectedTime, setSelectedTime] = useState<Date>(() => roundToNearestFiveMinutes(new Date()));
  const [showTimeEditor, setShowTimeEditor] = useState(false);

  // Routes and scores state
  const [rawRoutes, setRawRoutes] = useState<Route[]>([]);
  const [categorizedRoutes, setCategorizedRoutes] = useState<CategorizedRoute[]>([]);
  const [routeScores, setRouteScores] = useState<RouteScore[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [highlightedReason, setHighlightedReason] = useState<string | undefined>();

  // Status and error states
  const router = useRouter();
  const { activeJourney, startJourney } = useActiveJourney();
  const [isFetching, setIsFetching] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [showIncidentWarningModal, setShowIncidentWarningModal] = useState(false);
  const [errorState, setErrorState] = useState<RouteErrorState | null>(null);
  const [onlyOneRouteNotice, setOnlyOneRouteNotice] = useState<string | null>(null);

  // Geolocation
  const { coordinates, error: geoError, isLoading, useDemoLocation, locationName, retryLocation } = useGeolocation();
  const origin = coordinates;
  const originName = isLoading 
    ? "Getting your location..." 
    : geoError 
      ? geoError 
      : (locationName || "Current Location");

  // Destination Search
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destQuery, setDestQuery] = useState("");
  const [showDestOptions, setShowDestOptions] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (destQuery.length >= 3 && showDestOptions) {
        try {
          const results = await searchPlaces(destQuery);
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [destQuery, showDestOptions]);

  const selectDestination = (name: string, coords: [number, number]) => {
    setDestination(coords);
    setDestQuery(name);
    setShowDestOptions(false);
    setErrorState(null);
  };

  /**
   * Recalculates route categories and safety scores for a given time
   */
  const applyTimeRecalculation = (
    routesToScore: Route[], 
    targetTime: Date, 
    activeIncidents = incidents, 
    activeVenues = venues
  ) => {
    if (!routesToScore || routesToScore.length === 0) return;

    const categorized = categorizeThreeRoutes(routesToScore, targetTime, activeIncidents, activeVenues);
    setCategorizedRoutes(categorized);
    const scores = categorized.map(r => r.scoreData);
    setRouteScores(scores);

    // Default to Safer route if available, or best score
    setSelectedRouteIndex(prev => {
      if (prev !== null && prev >= 0 && prev < categorized.length) {
        return prev;
      }
      const saferIdx = categorized.findIndex(r => r.category === "Safer");
      if (saferIdx !== -1) return saferIdx;

      let bestIdx = 0;
      let maxScore = -1;
      scores.forEach((s, idx) => {
        if (s.safetyScore > maxScore) {
          maxScore = s.safetyScore;
          bestIdx = idx;
        }
      });
      return bestIdx;
    });
  };

  /**
   * Handles user changing time via the 5-minute picker
   */
  const handleTimeChange = (newTime: Date) => {
    setSelectedTime(newTime);
    if (rawRoutes.length > 0) {
      applyTimeRecalculation(rawRoutes, newTime);
    }
  };

  /**
   * Fetches real-time routes from OSRM, incidents, venues, and scores all 3 routes
   */
  const fetchAndScoreRoutes = async () => {
    if (!origin) {
      setErrorState({
        title: "Location Needed",
        message: "Please allow location access or select Demo location.",
        canRetry: true
      });
      return;
    }

    if (!destination) {
      setErrorState({
        title: "Destination Needed",
        message: "Please choose where you would like to go.",
        canRetry: false
      });
      return;
    }

    setIsFetching(true);
    setErrorState(null);
    setOnlyOneRouteNotice(null);

    let fetchedIncidents: any[] = [];
    let fetchedVenues: any[] = [];

    // 1. Fetch real-time incidents from database
    try {
      const res = await fetch("/api/incidents");
      if (res.ok) {
        const data = await res.json();
        fetchedIncidents = data.incidents || [];
        setIncidents(fetchedIncidents);
      }
    } catch (e) {
      console.warn("Failed to fetch incidents", e);
    }

    // 2. Fetch venues near origin for nightlife/activity context
    try {
      const res = await fetch(`/api/nearby?lat=${origin[1]}&lng=${origin[0]}&radius=5000`);
      if (res.ok) {
        const data = await res.json();
        fetchedVenues = data.results || [];
        setVenues(fetchedVenues);
      }
    } catch (e) {
      console.warn("Failed to fetch venues", e);
    }

    // 3. Request up to three distinct routes, actively querying avoidance detours around incidents
    try {
      const distinctRoutes = await getThreeDistinctRoutes(origin, destination, fetchedIncidents, selectedTime);

      if (distinctRoutes.length === 0) {
        setErrorState({
          title: "No Routes Found",
          message: "No driving routes were found between these locations. The areas might not be connected by navigable roads.",
          canRetry: true
        });
        setRawRoutes([]);
        setCategorizedRoutes([]);
        setRouteScores([]);
        setIsFetching(false);
        return;
      }

      setRawRoutes(distinctRoutes);

      // Check if only 1 route was physically available
      if (distinctRoutes.length === 1) {
        setOnlyOneRouteNotice("1 direct route is physically available for this corridor. Alternate detours could not be navigated.");
      }

      // 4. Categorize into Fastest, Balanced, and Safer with strict avoidance logic
      applyTimeRecalculation(distinctRoutes, selectedTime, fetchedIncidents, fetchedVenues);
    } catch (err: any) {
      console.error("Routing error:", err);
      setErrorState({
        title: "Routing Service Unavailable",
        message: err?.message || "Failed to calculate routes. Please check your network connection and retry.",
        canRetry: true
      });
      setRawRoutes([]);
      setCategorizedRoutes([]);
      setRouteScores([]);
    } finally {
      setIsFetching(false);
    }
  };

  // Currently selected route and score
  const selectedRoute = selectedRouteIndex !== null ? categorizedRoutes[selectedRouteIndex] : null;
  const selectedScore = selectedRouteIndex !== null ? routeScores[selectedRouteIndex] : null;

  const handleStartJourney = () => {
    if (origin && destination) {
      startJourney({
        origin,
        destination,
        destinationAddress: destQuery || "Destination",
        routes: categorizedRoutes,
        routeScores,
        selectedRouteIndex: selectedRouteIndex ?? 0,
      });
      router.push("/active-journey");
    } else {
      setNavigating(true);
    }
  };

  const handleStartNavigationClick = () => {
    if (selectedRoute?.crossesActiveIncident) {
      setShowIncidentWarningModal(true);
    } else {
      handleStartJourney();
    }
  };

  return (
    <main className="flex-1 relative h-[100dvh] w-full flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white">

      {/* Floating Header (Mobile Top) */}
      <div className="absolute top-0 left-0 w-full z-20 p-4 pointer-events-none pt-[env(safe-area-inset-top)] md:hidden">
        <header className="glass-panel rounded-full p-2 shadow-sm pointer-events-auto mx-auto max-w-md w-full flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors text-foreground">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="text-sm font-bold tracking-tight text-foreground">Route Planning</h1>
          </div>
          <ThemeToggle className="!p-2 mr-1" />
        </header>
      </div>

      {/* 1. Origin, Destination & Departure Time Search Panel */}
      {!navigating && categorizedRoutes.length === 0 && (
        <BottomSheet defaultExpanded={true}>
          <div className="flex flex-col gap-3 relative pb-4 pt-4 md:pt-0">
            {/* Active Journey In Progress Alert */}
            {activeJourney && (activeJourney.status === 'active' || activeJourney.status === 'paused') && (
              <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${activeJourney.status === 'active' ? 'bg-primary animate-pulse' : 'bg-warning'} shrink-0`} />
                  <div className="truncate">
                    <p className="text-xs font-bold text-foreground truncate">
                      Trip in progress to {activeJourney.destinationAddress || 'Destination'}
                    </p>
                    <p className="text-[11px] text-muted-fg font-medium">
                      {activeJourney.etaMinutes} min remaining · {activeJourney.safetyScore}/100 Safety
                    </p>
                  </div>
                </div>
                <Link
                  href="/active-journey"
                  className="text-xs font-bold px-3 py-1.5 bg-primary text-primary-fg rounded-xl shrink-0 hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Return to Trip
                </Link>
              </div>
            )}

            {/* Origin Location */}
            <div className="flex items-center gap-3 bg-[--background] border border-[--glass-border] rounded-xl p-3 shadow-xs">
              <Target size={18} className="text-blue-500 shrink-0" />
              <div className="flex-1 flex justify-between items-center gap-2">
                <span className={clsx("text-sm font-medium text-foreground truncate", !origin && "text-danger")}>
                  {originName}
                </span>
                {!origin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={retryLocation} 
                      className="text-xs bg-primary text-primary-fg px-2.5 py-1 rounded-md font-bold hover:bg-primary/90"
                    >
                      Retry
                    </button>
                    <button 
                      onClick={useDemoLocation} 
                      className="text-xs bg-muted px-2.5 py-1 rounded-md text-foreground font-bold hover:bg-muted/80"
                    >
                      Demo
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute left-7 top-10 bottom-10 w-0.5 bg-[--glass-border] z-0"></div>

            {/* Destination Input & Search */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 bg-[--background] border border-[--glass-border] rounded-xl p-3 shadow-xs focus-within:ring-2 ring-primary/20 transition-shadow">
                <MapPin size={18} className="text-primary shrink-0" />
                <input
                  type="text"
                  placeholder="Where to?"
                  value={destQuery}
                  onChange={(e) => {
                    setDestQuery(e.target.value);
                    setShowDestOptions(true);
                  }}
                  onFocus={() => setShowDestOptions(true)}
                  className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-muted-fg text-foreground"
                />
              </div>

              {/* Autocomplete / Suggested Destinations */}
              {showDestOptions && (
                <div className="absolute top-full left-0 w-full mt-2 glass-panel rounded-xl shadow-xl overflow-hidden z-30 max-h-60 overflow-y-auto">
                  {destQuery.length >= 3 ? (
                    searchResults.length > 0 ? (
                      searchResults.map((dest, i) => (
                        <button
                          key={`res-${i}`}
                          onClick={() => selectDestination(dest.name, dest.coordinates)}
                          className="w-full text-left px-4 py-3 text-sm border-b border-[--glass-border] hover:bg-muted/50 flex items-center gap-3 text-foreground"
                        >
                          <Search size={16} className="text-muted-fg shrink-0" />
                          <span className="truncate">{dest.displayName}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-fg">No results found</div>
                    )
                  ) : (
                    DEMO_DESTINATIONS.map((dest) => (
                      <button
                        key={dest.name}
                        onClick={() => selectDestination(dest.name, dest.coords)}
                        className="w-full text-left px-4 py-3 text-sm border-b border-[--glass-border] hover:bg-muted/50 flex items-center gap-3 text-foreground"
                      >
                        <Search size={16} className="text-muted-fg shrink-0" />
                        <span className="truncate">{dest.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Departure Time with 5-Minute Intervals */}
          <SectionHeader title="Departure Time" className="mt-2 mb-1" />
          <FiveMinuteTimePicker
            value={selectedTime}
            onChange={handleTimeChange}
            className="mb-4"
          />

          {/* Error Message Display */}
          {errorState && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-2xl flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-2 text-danger font-bold text-sm">
                <AlertTriangle size={18} />
                <span>{errorState.title}</span>
              </div>
              <p className="text-xs text-muted-fg">{errorState.message}</p>
              {errorState.canRetry && (
                <button
                  type="button"
                  onClick={fetchAndScoreRoutes}
                  className="self-start text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <RotateCcw size={14} /> Retry Calculation
                </button>
              )}
            </div>
          )}

          {/* Action Button */}
          {isFetching ? (
            <div className="space-y-3">
              <LoadingSkeleton type="card" className="h-14 !rounded-xl" />
              <LoadingSkeleton type="card" className="h-28 !rounded-xl" />
            </div>
          ) : (
            <GlassButton
              onClick={fetchAndScoreRoutes}
              disabled={!origin || !destination}
              className="w-full mt-2"
            >
              FIND SAFER ROUTE
            </GlassButton>
          )}
        </BottomSheet>
      )}

      {/* 2. Route Comparison Panel: Fastest, Balanced, Safer */}
      {categorizedRoutes.length > 0 && !navigating && (
        <BottomSheet defaultExpanded={true}>
          <div className="pt-4 md:pt-0">
            <SectionHeader 
              title="Select Route" 
              action={
                <button 
                  onClick={() => {
                    setCategorizedRoutes([]);
                    setRawRoutes([]);
                    setRouteScores([]);
                    setSelectedRouteIndex(null);
                  }} 
                  className="text-primary hover:opacity-80 text-sm font-semibold"
                >
                  Edit Search
                </button>
              } 
            />
          </div>

          {/* Quick Active Departure Time Bar with Toggle */}
          <div className="bg-[--background] border border-[--glass-border] rounded-2xl p-3 mb-3 shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground">
                  Safety analysis for <span className="text-primary">{formatTime12h(selectedTime)}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTimeEditor(!showTimeEditor)}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {showTimeEditor ? "Hide Time" : "Change Time"}
              </button>
            </div>

            {/* In-Panel 5-Minute Time Selector for Instant Score Recalculation */}
            <AnimatePresence>
              {showTimeEditor && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pt-2 border-t border-[--glass-border]"
                >
                  <FiveMinuteTimePicker
                    value={selectedTime}
                    onChange={handleTimeChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Single Route Notice (if applicable) */}
          {onlyOneRouteNotice && (
            <div className="p-3 bg-muted/40 border border-[--glass-border] rounded-xl flex items-center gap-2 mb-3 text-xs text-muted-fg">
              <Info size={16} className="text-primary shrink-0" />
              <span>{onlyOneRouteNotice}</span>
            </div>
          )}

          {/* Three Route Cards */}
          <motion.div 
            className="flex flex-col gap-3 pb-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            {categorizedRoutes.map((route, idx) => {
              const score = route.scoreData;
              const isSelected = selectedRouteIndex === idx;
              const fastestRoute = categorizedRoutes[0];
              const isFastest = route.category === "Fastest";
              const extraTime = !isFastest && fastestRoute ? Math.round((route.duration - fastestRoute.duration) / 60) : 0;
              const extraSafety = !isFastest && fastestRoute ? route.safetyScore - fastestRoute.safetyScore : 0;

              return (
                <motion.div
                  key={route.id || `route-${idx}`}
                  variants={{
                    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  onClick={() => {
                    setSelectedRouteIndex(idx);
                    setHighlightedReason(undefined);
                  }}
                  className={clsx(
                    "p-4 rounded-3xl border-2 cursor-pointer transition-all flex flex-col gap-3 relative overflow-hidden",
                    isSelected 
                      ? "border-primary bg-[--background] shadow-md ring-2 ring-primary/20" 
                      : "border-[--glass-border] bg-[--glass-bg] hover:bg-[--background]"
                  )}
                >
                  {isSelected && (
                    <motion.div 
                      layoutId="selected-route-bg" 
                      className="absolute inset-0 bg-primary/5 pointer-events-none" 
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className="flex gap-4 items-center relative z-10">
                    <SafetyScore score={route.safetyScore} size={56} strokeWidth={5} />
                    
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-base tracking-wide text-foreground">
                          {route.category}
                        </span>
                        <span className="font-black text-lg text-foreground leading-none">
                          {route.formattedDuration}
                        </span>
                      </div>
                      
                      {/* Required Format: [Duration] · [Distance] */}
                      <div className="text-xs font-semibold text-muted-fg mt-0.5">
                        {route.formattedDuration} · {route.formattedDistance}
                      </div>

                      {/* Required Format: Safety score: [Score]/100 */}
                      <div className="text-xs font-bold text-primary mt-1">
                        Safety score: {route.safetyScore}/100
                      </div>

                      {/* Incident Avoidance / Intersection Notice */}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {route.crossesActiveIncident ? (
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={12} className="shrink-0 text-amber-500" />
                            {route.incidentNotice}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldCheck size={12} className="shrink-0 text-emerald-500" />
                            {route.incidentNotice}
                          </span>
                        )}
                      </div>

                      {/* Trade-off summary */}
                      {!isFastest && (extraTime > 0 || extraSafety > 0) && (
                        <div className="text-[11px] font-semibold text-muted-fg mt-1 flex items-center gap-1.5">
                          {extraTime > 0 && <span>+{extraTime} min</span>}
                          {extraTime > 0 && extraSafety > 0 && <span>·</span>}
                          {extraSafety > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              +{extraSafety} safety
                            </span>
                          )}
                        </div>
                      )}

                      {/* Alert when all routes cross incident zones */}
                      {route.noCompleteAvoidance && (
                        <div className="mt-1 text-[11px] font-semibold text-danger bg-danger/10 px-2 py-1 rounded-lg border border-danger/20 flex items-center gap-1">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>No route completely avoids the reported risk area.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Route Details & Explainable Score Breakdown */}
                  <AnimatePresence>
                    {isSelected && score && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="pt-3 border-t border-[--glass-border] flex flex-col gap-3 relative z-10 overflow-hidden"
                      >
                        {/* 1. Explainable Score Breakdown */}
                        {score.scoreBreakdown && score.scoreBreakdown.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <span>Explainable Score Calculation</span>
                            </div>
                            <div className="bg-muted/40 rounded-xl p-2.5 flex flex-col gap-1 font-mono text-[11px] border border-[--glass-border]/50">
                              {score.scoreBreakdown.map((item, bIdx) => (
                                <div key={bIdx} className="flex justify-between items-center text-foreground">
                                  <span className="text-muted-fg font-sans text-xs">{item.label}</span>
                                  <span className={clsx(
                                    "font-bold",
                                    item.type === "base" ? "text-foreground" :
                                    item.impact > 0 ? "text-emerald-600 dark:text-emerald-400" :
                                    item.impact < 0 ? "text-danger" : "text-muted-fg"
                                  )}>
                                    {item.type === "base" ? item.impact : (item.impact > 0 ? `+${item.impact}` : `${item.impact}`)}
                                  </span>
                                </div>
                              ))}
                              <div className="border-t border-[--glass-border] pt-1 mt-1 flex justify-between items-center font-bold text-xs text-foreground">
                                <span className="font-sans">Final Score</span>
                                <span className="text-primary font-black text-sm">{route.safetyScore}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. Safety Factors */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-foreground">Safety Factors</div>
                            <div className="text-[11px] font-medium text-muted-fg">At {formatTime12h(selectedTime)}</div>
                          </div>

                          {score.factors.map((factor, i) => (
                            <div 
                              key={i} 
                              className={clsx(
                                "flex items-start gap-2 text-xs font-medium p-2 rounded-xl cursor-pointer transition-colors border",
                                highlightedReason === factor.reason 
                                  ? "border-primary bg-primary/10" 
                                  : "border-transparent hover:bg-muted/40"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setHighlightedReason(highlightedReason === factor.reason ? undefined : factor.reason);
                              }}
                            >
                              {factor.type === "negative" ? (
                                <AlertTriangle className={clsx("w-4 h-4 shrink-0 mt-0.5", highlightedReason === factor.reason ? "text-primary" : "text-amber-500")} />
                              ) : (
                                <ShieldCheck className={clsx("w-4 h-4 shrink-0 mt-0.5", highlightedReason === factor.reason ? "text-primary" : "text-emerald-500")} />
                              )}
                              <span className={clsx("leading-snug", highlightedReason === factor.reason ? "text-primary font-bold" : "text-foreground")}>
                                {factor.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>

          <GlassButton
            onClick={handleStartNavigationClick}
            className="w-full"
          >
            <Navigation size={18} />
            START NAVIGATION
          </GlassButton>
        </BottomSheet>
      )}

      {/* Pre-Navigation Incident Warning Confirmation Modal */}
      <AnimatePresence>
        {showIncidentWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[--background] border border-danger/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 text-danger">
                <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                  <ShieldAlert size={22} className="text-danger" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">Incident Zone Warning</h3>
                  <span className="text-xs text-danger font-semibold">Active Risk Area on Route</span>
                </div>
              </div>

              <p className="text-xs text-muted-fg leading-relaxed">
                This route crosses an active incident risk zone (
                <strong className="text-foreground">
                  {selectedRoute?.scoreData.intersectionSummary.totalMetersInRiskZones}m
                </strong>{" "}
                traversed within risk perimeter).
                {selectedRoute?.scoreData.intersectionSummary.crossedCriticalZone && (
                  <span className="block mt-1 text-danger font-bold">
                    ⚠️ Critical severity reports are active in this corridor.
                  </span>
                )}
              </p>

              <div className="flex flex-col gap-2 pt-2">
                {categorizedRoutes.some(r => !r.crossesActiveIncident) && (
                  <button
                    type="button"
                    onClick={() => {
                      const saferIdx = categorizedRoutes.findIndex(r => !r.crossesActiveIncident);
                      if (saferIdx !== -1) {
                        setSelectedRouteIndex(saferIdx);
                      }
                      setShowIncidentWarningModal(false);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck size={16} />
                    Switch to Safe Route
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowIncidentWarningModal(false);
                    handleStartJourney();
                  }}
                  className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-colors"
                >
                  Proceed Anyway
                </button>

                <button
                  type="button"
                  onClick={() => setShowIncidentWarningModal(false)}
                  className="w-full py-2 text-muted-fg hover:text-foreground text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Live Navigation Panel */}
      {navigating && (
        <BottomSheet defaultExpanded={true}>
          <div className="pt-4 md:pt-0 flex justify-between items-center mb-6">
            <StatusPill status={selectedScore?.riskLevel === 'ELEVATED' ? 'warning' : 'safe'}>
              <ShieldCheck size={14} />
              On {selectedRoute?.category || "Selected"} Route
            </StatusPill>
            <button 
              onClick={() => setNavigating(false)} 
              className="text-xs font-bold px-3 py-1.5 bg-muted rounded-full hover:bg-muted/80 text-foreground"
            >
              EXIT
            </button>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-5xl font-black mb-1 text-foreground">
              {selectedRoute ? selectedRoute.formattedDuration : "--"}
            </h2>
            <span className="text-sm font-semibold text-muted-fg">
              {selectedRoute?.formattedDistance} · Safety Score {selectedRoute?.safetyScore}/100
            </span>
          </div>

          <div className="flex flex-col gap-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <GlassButton 
                variant="secondary" 
                className="!p-4 flex-col gap-2"
                onClick={() => {
                  if (origin && destination) {
                    window.open(`https://maps.google.com/?saddr=${origin[1]},${origin[0]}&daddr=${destination[1]},${destination[0]}`, "_blank");
                  } else {
                    alert("Coordinates are missing.");
                  }
                }}
              >
                <Navigation size={20} className="text-primary" />
                <span className="text-sm">Directions</span>
              </GlassButton>
              
              <GlassButton 
                variant="secondary" 
                className="!p-4 flex-col gap-2"
                onClick={async () => {
                  if (sharingRef.current) return;
                  sharingRef.current = true;
                  try {
                    const label = selectedRoute?.category || "Selected";
                    const dur = selectedRoute ? selectedRoute.formattedDuration : "";
                    const dist = selectedRoute ? selectedRoute.formattedDistance : "";
                    const score = selectedScore?.safetyScore || "";
                    const text = `My Journey to ${destQuery || 'destination'}\n${label} Route (${dur}, ${dist})\nSafety Score: ${score}/100`;
                    
                    let url = window.location.href;
                    if (origin && destination) {
                      url = `https://maps.google.com/?saddr=${origin[1]},${origin[0]}&daddr=${destination[1]},${destination[0]}`;
                    }

                    if (navigator.share) {
                      await navigator.share({ title: "My Journey", text, url });
                    } else if (navigator.clipboard) {
                      await navigator.clipboard.writeText(`${text}\n${url}`);
                      alert("Link copied to clipboard!");
                    }
                  } catch (e: any) {
                    if (e.name !== "AbortError" && e.name !== "InvalidStateError") {
                      console.warn("Share failed", e);
                      alert("Sharing is unavailable.");
                    }
                  } finally {
                    sharingRef.current = false;
                  }
                }}
              >
                <MapPin size={20} className="text-foreground" />
                <span className="text-sm">Share</span>
              </GlassButton>
            </div>
            <div className="h-16">
              <SOSButton />
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Map Container */}
      <motion.div 
        className="absolute inset-0 md:relative md:flex-1 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Map
          routes={categorizedRoutes}
          routeScores={routeScores}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={(idx) => {
            setSelectedRouteIndex(idx);
            setHighlightedReason(undefined);
          }}
          origin={origin || undefined}
          destination={destination || undefined}
          selectedTime={selectedTime}
          highlightedReason={highlightedReason}
          incidents={incidents}
        />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[--background] to-transparent pointer-events-none z-10" />
        
        {/* Floating Header for Desktop inside Map */}
        <div className="hidden md:block absolute top-6 left-6 z-20 pointer-events-none">
          <header className="glass-panel rounded-full p-2 shadow-sm pointer-events-auto flex items-center justify-between min-w-[200px]">
            <div className="flex items-center gap-1">
              <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors text-foreground">
                <ChevronLeft size={20} />
              </Link>
              <h1 className="text-sm font-bold tracking-tight text-foreground pr-2">Route Planning</h1>
            </div>
          </header>
        </div>
      </motion.div>
    </main>
  );
}

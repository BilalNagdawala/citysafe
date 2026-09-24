"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ShieldAlert,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Navigation,
  ExternalLink,
  MapPin,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Shield,
  Clock,
  Compass,
  Search,
  AlertCircle
} from "lucide-react";
import { NearbyLocation } from "@/app/api/nearby/route";

// Dynamically import map component with SSR disabled
const NearbyMap = dynamic(() => import("@/components/NearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-xs font-semibold tracking-wide">Loading Interactive Map...</span>
    </div>
  ),
});

type CategoryType = "police" | "hospital" | "emergency" | "safe";

interface CategoryMeta {
  title: string;
  subtitle: string;
  icon: typeof ShieldAlert;
  color: string;
  badgeBg: string;
  markerColor: string;
}

const CATEGORY_CONFIG: Record<CategoryType, CategoryMeta> = {
  police: {
    title: "Police Stations",
    subtitle: "Active law enforcement facilities and public security desks",
    icon: ShieldAlert,
    color: "text-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    markerColor: "#3b82f6",
  },
  hospital: {
    title: "Hospitals & Clinics",
    subtitle: "Emergency medical facilities, trauma clinics, and urgent care",
    icon: Building2,
    color: "text-red-500",
    badgeBg: "bg-red-500/10 text-red-500 border-red-500/20",
    markerColor: "#ef4444",
  },
  emergency: {
    title: "Emergency Services",
    subtitle: "Combined police, fire stations, ambulances, and response teams",
    icon: AlertTriangle,
    color: "text-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    markerColor: "#f59e0b",
  },
  safe: {
    title: "Verified Safe Locations",
    subtitle: "Designated safe spaces, 24/7 staffed centers, and official safety posts",
    icon: CheckCircle2,
    color: "text-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    markerColor: "#10b981",
  },
};

function NearbyHelpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawCategory = searchParams.get("category") || "police";
  const category: CategoryType = ["police", "hospital", "emergency", "safe"].includes(rawCategory)
    ? (rawCategory as CategoryType)
    : "police";

  // Location state
  const [deviceCoords, setDeviceCoords] = useState<[number, number] | null>(null); // [lat, lng]
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState<string | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);

  // Facility data state
  const [locations, setLocations] = useState<NearbyLocation[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(false);
  const [facilityError, setFacilityError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ code?: string; message?: string } | null>(null);
  const [providerUsed, setProviderUsed] = useState<string>("osm");

  // Interactive selection state
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Active category config
  const meta = CATEGORY_CONFIG[category];
  const IconComponent = meta.icon;

  // 1. Acquire real device location
  const requestDeviceLocation = useCallback(() => {
    setLocLoading(true);
    setLocError(null);
    setFacilityError(null);
    setErrorDetails(null);

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocError("Geolocation is not supported by your browser.");
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDeviceCoords([lat, lng]);
        setLocLoading(false);

        // Reverse geocode human-readable area name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { "User-Agent": "CitySafe-App/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            const resolved =
              data.address?.suburb ||
              data.address?.neighbourhood ||
              data.address?.city ||
              data.address?.town ||
              data.display_name?.split(",")[0];
            if (resolved) setAreaName(resolved);
          }
        } catch {
          // Non-critical, fallback to coordinates
        }
      },
      (err) => {
        let msg = "Failed to acquire device location.";
        switch (err.code) {
          case 1:
            msg = "Location permission denied. Please allow location access in your browser to view nearby help.";
            break;
          case 2:
            msg = "Location information is unavailable. Please check your device GPS or connection.";
            break;
          case 3:
            msg = "The request to get user location timed out. Please try again.";
            break;
        }
        setLocError(msg);
        setLocLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }, []);

  // Request location on initial mount
  useEffect(() => {
    requestDeviceLocation();
  }, [requestDeviceLocation]);

  // 2. Fetch nearby facilities when device coordinates or category changes
  const fetchFacilities = useCallback(
    async (providerOverride?: string) => {
      if (!deviceCoords) return;

      setIsLoadingFacilities(true);
      setFacilityError(null);
      setErrorDetails(null);

      const [lat, lng] = deviceCoords;
      const providerQuery = providerOverride ? `&provider=${providerOverride}` : "";
      const url = `/api/nearby?lat=${lat}&lng=${lng}&category=${category}&radius=4000${providerQuery}`;

      try {
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setFacilityError(data.error || "Unable to load nearby facilities.");
          setErrorDetails({ code: data.code, message: data.error });
          setLocations([]);
          return;
        }

        setLocations(data.locations || []);
        setProviderUsed(data.provider || "osm");
        if (data.locations?.length > 0) {
          setSelectedLocationId(data.locations[0].id);
        } else {
          setSelectedLocationId(null);
        }
      } catch (err: any) {
        setFacilityError("Network error: Could not reach the safety server. Please check your connection.");
        setLocations([]);
      } finally {
        setIsLoadingFacilities(false);
      }
    },
    [deviceCoords, category]
  );

  useEffect(() => {
    if (deviceCoords) {
      fetchFacilities();
    }
  }, [deviceCoords, fetchFacilities]);

  // Handle category switch
  const handleCategorySwitch = (newCat: CategoryType) => {
    router.push(`/nearby-help?category=${newCat}`);
  };

  // Google Maps external query builders
  const openCurrentLocationInMaps = () => {
    if (deviceCoords) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${deviceCoords[0]},${deviceCoords[1]}`,
        "_blank"
      );
    }
  };

  const searchSafePlacesInMaps = () => {
    if (deviceCoords) {
      const q =
        category === "police"
          ? "police station"
          : category === "hospital"
          ? "hospital emergency"
          : category === "emergency"
          ? "emergency services fire hospital police"
          : "police hospital public shelter";
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&query_place_id=&center=${deviceCoords[0]},${deviceCoords[1]}`,
        "_blank"
      );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-background text-foreground">
      {/* Top Sticky Header */}
      <header className="shrink-0 border-b border-[--glass-border] bg-card/80 backdrop-blur-md px-4 py-3 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Back & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/safety-tools"
              className="w-10 h-10 rounded-full border border-[--glass-border] bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors shrink-0 text-foreground"
              aria-label="Back to Safety Tools"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${meta.badgeBg} border`}>
                  <IconComponent size={18} />
                </span>
                <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-foreground">
                  {meta.title}
                </h1>
              </div>
              <p className="text-xs text-muted-fg mt-0.5 line-clamp-1">{meta.subtitle}</p>
            </div>
          </div>

          {/* Current Location Badge & Refresh */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-[--glass-border] text-xs font-semibold text-foreground">
              <MapPin size={14} className="text-primary shrink-0" />
              <span className="truncate max-w-[200px]">
                {locLoading
                  ? "Locating device..."
                  : areaName
                  ? areaName
                  : deviceCoords
                  ? `${deviceCoords[0].toFixed(3)}, ${deviceCoords[1].toFixed(3)}`
                  : "Location unavailable"}
              </span>
            </div>
            <button
              onClick={() => {
                requestDeviceLocation();
              }}
              disabled={locLoading || isLoadingFacilities}
              className="p-2 rounded-full border border-[--glass-border] hover:bg-slate-100 dark:hover:bg-zinc-800 text-foreground transition-colors disabled:opacity-50"
              title="Refresh Location & Facilities"
              aria-label="Refresh"
            >
              <RefreshCw
                size={16}
                className={locLoading || isLoadingFacilities ? "animate-spin text-primary" : ""}
              />
            </button>
          </div>
        </div>

        {/* Category Pills Navigation */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(["police", "hospital", "emergency", "safe"] as CategoryType[]).map((catKey) => {
            const isSelected = catKey === category;
            const cMeta = CATEGORY_CONFIG[catKey];
            const CIcon = cMeta.icon;
            return (
              <button
                key={catKey}
                onClick={() => handleCategorySwitch(catKey)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
                  isSelected
                    ? "bg-primary text-primary-fg shadow-md scale-[1.02]"
                    : "bg-card border border-[--glass-border] text-muted-fg hover:text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                <CIcon size={15} />
                <span>{cMeta.title}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area: Split View Desktop, Stacked Mobile */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Column: Scrollable List & Emergency Banners */}
        <div className="w-full md:w-[460px] lg:w-[500px] shrink-0 flex flex-col h-full border-r border-[--glass-border] bg-background/50 overflow-hidden z-10">
          {/* Emergency 112 Banner if emergency category */}
          {category === "emergency" && (
            <div className="p-3 bg-red-500/10 border-b border-red-500/20">
              <a
                href="tel:112"
                className="w-full min-h-[44px] px-4 py-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl flex items-center justify-between shadow-lg transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-white" />
                  </div>
                  <div>
                    <span className="block leading-tight">Call Emergency Services — 112</span>
                    <span className="text-[11px] font-normal text-red-100">
                      National Centralized Emergency Helpline
                    </span>
                  </div>
                </div>
                <span className="text-xs bg-white text-red-700 font-black px-2.5 py-1 rounded-md">
                  CALL NOW
                </span>
              </a>
            </div>
          )}

          {/* Missing API Key Warning / Error Banner */}
          {errorDetails?.code === "MISSING_API_KEY" && (
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-bold text-amber-500">API Configuration Missing</p>
                  <p className="text-muted-fg leading-relaxed">{errorDetails.message}</p>
                  <button
                    onClick={() => fetchFacilities("osm")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors mt-1"
                  >
                    <Compass size={14} /> Switch to OpenStreetMap (Live Data)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Facility List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Location Acquisition Loading */}
            {locLoading && (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <h3 className="font-bold text-sm text-foreground">Acquiring your device location...</h3>
                <p className="text-xs text-muted-fg max-w-xs">
                  Requesting precise GPS coordinates from your device to find genuine nearby facilities.
                </p>
              </div>
            )}

            {/* Location Error State */}
            {!locLoading && locError && (
              <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
                <h3 className="font-bold text-sm text-foreground">Location Access Required</h3>
                <p className="text-xs text-muted-fg">{locError}</p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={requestDeviceLocation}
                    className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-primary text-primary-fg font-bold text-xs hover:bg-primary/90 transition-colors"
                  >
                    Retry Location Request
                  </button>
                  <button
                    onClick={searchSafePlacesInMaps}
                    className="w-full min-h-[44px] py-2 px-4 rounded-xl border border-[--glass-border] bg-card text-foreground font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={14} /> Search in Google Maps
                  </button>
                </div>
              </div>
            )}

            {/* Facilities Loading State */}
            {!locLoading && !locError && isLoadingFacilities && (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <h3 className="font-bold text-sm text-foreground">Searching Nearby {meta.title}...</h3>
                <p className="text-xs text-muted-fg">Scanning verified safety database within 4km radius.</p>
              </div>
            )}

            {/* Facility Error State (other than missing key) */}
            {!locLoading && !locError && !isLoadingFacilities && facilityError && errorDetails?.code !== "MISSING_API_KEY" && (
              <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                <h3 className="font-bold text-sm text-foreground">Failed to Load Nearby Help</h3>
                <p className="text-xs text-muted-fg">{facilityError}</p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => fetchFacilities()}
                    className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-primary text-primary-fg font-bold text-xs hover:bg-primary/90 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={searchSafePlacesInMaps}
                    className="w-full min-h-[44px] py-2 px-4 rounded-xl border border-[--glass-border] bg-card text-foreground font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={14} /> Search in Google Maps
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!locLoading &&
              !locError &&
              !isLoadingFacilities &&
              !facilityError &&
              locations.length === 0 && (
                <div className="p-6 rounded-2xl bg-card border border-[--glass-border] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-muted-fg">
                    <Search size={22} />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">
                    {category === "safe"
                      ? "No verified safe locations found nearby."
                      : `No nearby ${meta.title.toLowerCase()} found.`}
                  </h3>
                  <p className="text-xs text-muted-fg max-w-xs mx-auto">
                    We could not locate verified facilities in this specific radius. Use Maps to inspect the broader area.
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={openCurrentLocationInMaps}
                      className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-primary text-primary-fg font-bold text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MapPin size={14} /> Open Current Location
                    </button>
                    <button
                      onClick={searchSafePlacesInMaps}
                      className="w-full min-h-[44px] py-2 px-4 rounded-xl border border-[--glass-border] bg-card text-foreground font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={14} /> Search Safe Places in Maps
                    </button>
                  </div>
                </div>
              )}

            {/* Results Count Header */}
            {!locLoading && !locError && !isLoadingFacilities && locations.length > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-fg px-1 pb-1">
                <span className="font-bold text-foreground">
                  {locations.length} {meta.title} Nearby
                </span>
                <span className="text-[11px]">Sorted by closest</span>
              </div>
            )}

            {/* Facility Cards */}
            {!locLoading &&
              !locError &&
              !isLoadingFacilities &&
              locations.map((loc, idx) => {
                const isSelected = loc.id === selectedLocationId;
                const distanceStr =
                  loc.distanceMeters < 1000
                    ? `${loc.distanceMeters} m`
                    : `${(loc.distanceMeters / 1000).toFixed(1)} km`;

                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30"
                        : "border-[--glass-border] bg-card hover:bg-slate-100/60 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {/* Header: Number, Name, Distance */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 border border-[--glass-border] flex items-center justify-center text-xs font-bold text-foreground shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-foreground leading-snug">{loc.name}</h4>
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            <Shield size={11} /> Verified Facility
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px] font-bold text-foreground whitespace-nowrap shrink-0">
                        {distanceStr}
                      </span>
                    </div>

                    {/* Address */}
                    <p className="text-xs text-muted-fg mt-2 pl-8 leading-relaxed">{loc.address}</p>

                    {/* Safe Locations: Why Safe Explanation */}
                    {loc.whySafe && (
                      <div className="mt-2.5 ml-8 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300">
                        <span className="font-bold block mb-0.5">Why it is safe:</span>
                        <p className="leading-relaxed">{loc.whySafe}</p>
                      </div>
                    )}

                    {/* Operating Hours & Phone Info */}
                    <div className="mt-3 ml-8 flex flex-wrap items-center gap-3 text-xs text-muted-fg border-t border-[--glass-border] pt-2.5">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Clock size={12} className="text-primary" />
                        <span className="font-medium">{loc.operatingHours || "Open 24 Hours"}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Phone size={12} className={loc.phone ? "text-emerald-500" : "text-slate-400"} />
                        <span className="font-medium">
                          {loc.phone ? loc.phone : "Phone number unavailable"}
                        </span>
                      </span>
                    </div>

                    {/* Action Buttons: Call, Directions, Open in Maps (min 44px touch targets) */}
                    <div className="mt-3 ml-8 grid grid-cols-2 gap-2">
                      {loc.phone ? (
                        <a
                          href={`tel:${loc.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Phone size={14} /> Call
                        </a>
                      ) : (
                        <button
                          disabled
                          onClick={(e) => e.stopPropagation()}
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                        >
                          <Phone size={14} /> No Phone
                        </button>
                      )}

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-fg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Navigation size={14} /> Get Directions
                      </a>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Column: Full Interactive Map */}
        <div className="flex-1 h-full min-h-[300px] relative bg-slate-900">
          <NearbyMap
            userLocation={deviceCoords}
            locations={locations}
            selectedLocationId={selectedLocationId}
            onSelectLocation={(id) => setSelectedLocationId(id)}
            category={category}
          />
        </div>
      </div>
    </div>
  );
}

export default function NearbyHelpPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-semibold">Loading Nearby Help...</span>
          </div>
        </div>
      }
    >
      <NearbyHelpContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Route } from "@/lib/osrm";
import { RouteScore } from "@/lib/safety";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface MapProps {
  center?: [number, number];
  zoom?: number;
  routes?: Route[];
  routeScores?: RouteScore[];
  selectedRouteIndex?: number | null;
  onSelectRoute?: (index: number) => void;
  origin?: [number, number];
  destination?: [number, number];
  selectedTime?: Date;
  highlightedReason?: string;
  incidents?: any[];
  children?: React.ReactNode;
}

function BoundsFitter({ 
  routes, 
  routeScores,
  selectedRouteIndex 
}: { 
  routes: Route[]; 
  routeScores?: RouteScore[];
  selectedRouteIndex?: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!routes || routes.length === 0) return;

    const bounds = L.latLngBounds([]);
    if (selectedRouteIndex !== null && selectedRouteIndex !== undefined && routes[selectedRouteIndex]) {
      // Fit specifically to the selected route
      routes[selectedRouteIndex].geometry.coordinates.forEach(c => {
        bounds.extend([c[1], c[0]]);
      });

      // Also fit to any incident risk zones intersected by this route
      const currentScore = routeScores?.[selectedRouteIndex];
      if (currentScore && currentScore.dangerZones) {
        currentScore.dangerZones.forEach(dz => {
          if (dz.isIntersected) {
            bounds.extend([dz.center[1], dz.center[0]]);
          }
        });
      }
    } else {
      // Fit across all returned routes
      routes.forEach(route => {
        route.geometry.coordinates.forEach(c => {
          bounds.extend([c[1], c[0]]);
        });
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  }, [routes, routeScores, selectedRouteIndex, map]);
  return null;
}

function ResizeTracker() {
  const map = useMap();
  const mountedRef = useRef(true);
  const mapRef = useRef(map);
  const timers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    mapRef.current = map;
    timers.current = [];

    const safeInvalidateSize = () => {
      if (!mountedRef.current || !mapRef.current) return;

      try {
        const container = mapRef.current.getContainer();
        if (!container || !container.isConnected) return;

        requestAnimationFrame(() => {
          if (!mountedRef.current || !mapRef.current) return;
          
          const currentContainer = mapRef.current.getContainer();
          if (!currentContainer || !currentContainer.isConnected) return;

          try {
            mapRef.current.invalidateSize({ pan: false });
          } catch {
            // Ignore resize calls after map teardown
          }
        });
      } catch {
        // Ignore invalid map/container state
      }
    };

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(safeInvalidateSize, 100);
      timers.current.push(resizeTimer);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    
    timers.current.push(setTimeout(safeInvalidateSize, 100));
    timers.current.push(setTimeout(safeInvalidateSize, 500));
    timers.current.push(setTimeout(safeInvalidateSize, 1000));
    
    return () => {
      mountedRef.current = false;
      clearTimeout(resizeTimer);
      timers.current.forEach(clearTimeout);
      timers.current = [];
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [map]);
  return null;
}

// Warning icon for affected segments
const warningDivIcon = typeof window !== "undefined"
  ? L.divIcon({
      className: "incident-warning-marker",
      html: `
        <div style="background-color: #ef4444; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white; transform: translate(-50%, -50%);">
          ⚠️
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    })
  : undefined;

export default function Map({ 
  center = [19.1136, 72.8697], 
  zoom = 14, 
  routes = [], 
  routeScores = [], 
  selectedRouteIndex = null, 
  onSelectRoute,
  origin, 
  destination, 
  selectedTime = new Date(), 
  highlightedReason, 
  incidents = [],
  children
}: MapProps) {
  const [mounted, setMounted] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [assistanceLocations, setAssistanceLocations] = useState<any[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;
  const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Fetch dynamic assistance locations based on destination or origin
  useEffect(() => {
    const fetchAssistance = async () => {
      const targetCoords = destination || origin;
      if (!targetCoords) return;
      
      try {
        const res = await fetch(`/api/nearby?lat=${targetCoords[1]}&lng=${targetCoords[0]}&radius=2000`);
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.results || []).filter((loc: any) => 
            loc.category.includes("police") || loc.category.includes("hospital")
          ).slice(0, 5);
          setAssistanceLocations(filtered);
        }
      } catch (e) {
        console.error("Failed to fetch map assistance locations", e);
      }
    };
    
    const timer = setTimeout(fetchAssistance, 500);
    return () => clearTimeout(timer);
  }, [destination, origin]);

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    const checkHeight = () => {
      if (containerRef.current && containerRef.current.clientHeight > 0) {
        setMounted(true);
      } else {
        requestAnimationFrame(checkHeight);
      }
    };
    checkHeight();
    
    return () => setMounted(false);
  }, [tileUrl]);

  const getRouteColor = (score?: RouteScore, isSelected?: boolean) => {
    if (!score) return "#9ca3af";
    // Check if route crosses critical or high incidents
    if (score.intersectionSummary?.crossedCriticalZone) return "#ef4444"; // red
    if (score.intersectionSummary?.crossedHighZone) return "#f97316"; // orange
    if (score.riskLevel === "ELEVATED") return "#d47a6a";
    if (score.riskLevel === "MODERATE") return "#d99a4e";
    return "#3b82f6"; // blue (safe)
  };

  const getRouteWeight = (isSelected: boolean) => isSelected ? 8 : 4;
  const getRouteOpacity = (isSelected: boolean) => isSelected ? 1 : 0.35;

  const finalTileUrl = tileUrl || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const finalAttribution = tileUrl ? attribution : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const showAssistance = highlightedReason?.toLowerCase().includes("assistance") || highlightedReason?.toLowerCase().includes("police");
  const hour = selectedTime.getHours();
  const isNight = hour >= 19 || hour <= 5;
  const showTimeLayer = highlightedReason?.toLowerCase().includes("time");

  // Determine active danger zones from selected route or first route
  const activeScore = selectedRouteIndex !== null ? routeScores[selectedRouteIndex] : routeScores[0];
  const currentDangerZones = activeScore?.dangerZones || [];
  const intersections = activeScore?.intersectionSummary?.intersections || [];

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[50dvh] relative z-0 bg-slate-100 dark:bg-zinc-800"
      style={{ touchAction: "none" }}
    >
      {!mounted && !tileError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-zinc-800 z-10">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}

      {tileError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[--background]/90 backdrop-blur-sm p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-warning mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-1">Map Connection Error</h3>
          <p className="text-sm text-muted-fg font-medium">Failed to load map tiles. Please check your network connection.</p>
          <button 
            onClick={() => setTileError(false)} 
            className="mt-4 px-4 py-2 bg-primary text-primary-fg rounded-full text-sm font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Map Legend */}
      {mounted && (
        <div className="absolute bottom-6 right-6 z-[400] bg-card/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-[--border] text-xs font-medium text-foreground">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Safer Segment
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-[#d99a4e]"></div> Caution Area
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div> Active Incident Zone
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-fg pt-1 border-t border-[--border]">
            <span>Dimmed circles = Uncrossed zones</span>
          </div>
        </div>
      )}

      {mounted && (
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution={finalAttribution}
            url={finalTileUrl}
            eventHandlers={{
              tileerror: () => setTileError(true)
            }}
            className={showTimeLayer && isNight ? "brightness-50 contrast-125 saturate-50" : ""}
          />
          <ResizeTracker />
          
          {/* Fit bounds dynamically to selected route and its intersected incident zones */}
          {(origin || destination || routes.length > 0) && (
            <BoundsFitter 
              routes={routes} 
              routeScores={routeScores} 
              selectedRouteIndex={selectedRouteIndex} 
            />
          )}

          {origin && (
            <Marker position={[origin[1], origin[0]]}>
              <Popup>
                <div className="text-xs font-bold text-foreground">Origin</div>
                <div className="text-[11px] text-muted-fg">{origin[1].toFixed(4)}, {origin[0].toFixed(4)}</div>
              </Popup>
            </Marker>
          )}

          {destination && (
            <Marker position={[destination[1], destination[0]]}>
              <Popup>
                <div className="text-xs font-bold text-foreground">Destination</div>
                <div className="text-[11px] text-muted-fg">{destination[1].toFixed(4)}, {destination[0].toFixed(4)}</div>
              </Popup>
            </Marker>
          )}

          {/* Background / Dimmed Routes */}
          {routes.map((route, idx) => {
            if (idx === selectedRouteIndex) return null;
            const score = routeScores.find(s => s.routeIndex === idx);
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]] as [number, number]);
            return (
              <Polyline 
                key={`route-${route.id || idx}`}
                positions={coords}
                eventHandlers={{
                  click: () => onSelectRoute?.(idx)
                }}
                pathOptions={{
                  color: getRouteColor(score, false),
                  weight: getRouteWeight(false),
                  opacity: getRouteOpacity(false),
                }}
              />
            );
          })}

          {/* Highlighted Selected Route (drawn on top) */}
          {selectedRouteIndex !== null && routes[selectedRouteIndex] && (
            <Polyline 
              key={`route-selected-${routes[selectedRouteIndex].id || selectedRouteIndex}`}
              positions={routes[selectedRouteIndex].geometry.coordinates.map(c => [c[1], c[0]] as [number, number])}
              pathOptions={{
                color: getRouteColor(routeScores.find(s => s.routeIndex === selectedRouteIndex), true),
                weight: getRouteWeight(true),
                opacity: getRouteOpacity(true),
              }}
            />
          )}

          {/* Assistance Locations */}
          {(showAssistance || !highlightedReason) && assistanceLocations.map((loc, idx) => (
            <Circle
              key={`help-${idx}`}
              center={[loc.lat, loc.lon]}
              radius={300}
              pathOptions={{ 
                color: "#3b82f6", 
                fillColor: "#60a5fa", 
                fillOpacity: showAssistance ? 0.6 : 0.2,
                weight: showAssistance ? 2 : 0
              }}
            >
              <Popup>
                <div className="text-sm font-semibold text-primary">🛡️ {loc.name}</div>
                {loc.phone && <div className="text-xs mt-1">📞 {loc.phone}</div>}
              </Popup>
            </Circle>
          ))}

          {/* Synchronized Geographic Incident Risk Zones */}
          {currentDangerZones.map((zone, idx) => {
            const isIntersected = Boolean(zone.isIntersected);
            const isCriticalOrHigh = zone.severityLevel === "CRITICAL" || zone.severityLevel === "HIGH";

            // Colors: vibrant and bold when intersected, dimmed when unaffected
            const strokeColor = isIntersected
              ? (isCriticalOrHigh ? "#dc2626" : "#ea580c")
              : "#9ca3af";
            const fillColor = isIntersected
              ? (isCriticalOrHigh ? "#ef4444" : "#f97316")
              : "#d1d5db";
            const fillOpacity = isIntersected ? 0.45 : 0.12;
            const weight = isIntersected ? 3 : 1;

            return (
              <Circle
                key={`incident-risk-zone-${idx}`}
                center={[zone.center[1], zone.center[0]]}
                radius={zone.radiusMeters}
                pathOptions={{ 
                  color: strokeColor, 
                  fillColor: fillColor, 
                  fillOpacity: fillOpacity,
                  weight: weight
                }}
              >
                <Popup>
                  <div className="text-sm font-bold text-danger flex items-center gap-1.5">
                    <ShieldAlert size={16} />
                    <span>{zone.name} ({zone.severityLevel})</span>
                  </div>
                  <div className="text-xs text-muted-fg mt-1">
                    Risk Radius: {zone.radiusMeters}m
                  </div>
                  <div className="text-xs mt-1 font-semibold">
                    {isIntersected ? (
                      <span className="text-danger font-bold">
                        ⚠ Route intersects this active risk zone!
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ✓ Selected route avoids this zone
                      </span>
                    )}
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {/* Warning Markers on Intersected Route Segments */}
          {warningDivIcon && intersections.map((intersection, idx) => {
            if (!intersection.isIntersected || !intersection.intersectionPoint) return null;
            return (
              <Marker
                key={`warning-point-${idx}`}
                position={[intersection.intersectionPoint[1], intersection.intersectionPoint[0]]}
                icon={warningDivIcon}
              >
                <Popup>
                  <div className="text-xs font-bold text-danger">
                    ⚠️ Route Traverses Risk Area
                  </div>
                  <div className="text-[11px] text-muted-fg mt-0.5">
                    {intersection.category} ({intersection.metersInsideZone}m inside zone)
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {children}
        </MapContainer>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HeatmapLayer from './HeatmapLayer';
import { useGuardianData } from '@/providers/GuardianDataProvider';
import Map from '@/components/Map';
import { Plus, Minus, LocateFixed, Eye } from 'lucide-react';
import MapDetailPanel from './MapDetailPanel';
import { isValidLatLng } from '@/lib/geo-utils';

// SVG Icons for different markers
const alertIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L2 22h20L12 2z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
`;

const incidentIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#f59e0b" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
`;

const journeyIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z"></path>
  </svg>
`;

const createSvgIcon = (svgString: string) => {
  return L.divIcon({
    html: svgString,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const alertIcon = createSvgIcon(alertIconSvg);
const incidentIcon = createSvgIcon(incidentIconSvg);
const journeyIcon = createSvgIcon(journeyIconSvg);

// Zoom Controls Component
function MapControls({ onFitBounds, onCenterAlerts }: { onFitBounds: () => void, onCenterAlerts: () => void }) {
  const map = useMap();
  
  return (
    <div className="absolute right-4 bottom-4 z-[400] flex flex-col gap-2">
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); map.zoomIn(); }}
        className="w-10 h-10 bg-card/90 backdrop-blur-md rounded-xl shadow-lg border border-[--border] flex items-center justify-center text-foreground hover:bg-muted hover:text-primary transition-colors"
        aria-label="Zoom in"
      >
        <Plus size={20} />
      </button>
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); map.zoomOut(); }}
        className="w-10 h-10 bg-card/90 backdrop-blur-md rounded-xl shadow-lg border border-[--border] flex items-center justify-center text-foreground hover:bg-muted hover:text-primary transition-colors"
        aria-label="Zoom out"
      >
        <Minus size={20} />
      </button>
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFitBounds(); }}
        className="w-10 h-10 bg-card/90 backdrop-blur-md rounded-xl shadow-lg border border-[--border] flex items-center justify-center text-foreground hover:bg-muted hover:text-primary transition-colors mt-2"
        aria-label="Fit bounds"
        title="Fit all visible events"
      >
        <Eye size={20} />
      </button>
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCenterAlerts(); }}
        className="w-10 h-10 bg-card/90 backdrop-blur-md rounded-xl shadow-lg border border-[--border] flex items-center justify-center text-foreground hover:bg-muted hover:text-danger transition-colors"
        aria-label="Center on active alerts"
        title="Center on active alerts"
      >
        <LocateFixed size={20} />
      </button>
    </div>
  );
}

// Controller component to interact with the Leaflet map instance
function MapController({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [bounds, map]);

  return null;
}

export default function GuardianMap() {
  const { reports, alerts, journeys, guardians } = useGuardianData();
  const [mounted, setMounted] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showJourneys, setShowJourneys] = useState(true);
  
  const [activeMarker, setActiveMarker] = useState<any | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  
  const center: [number, number] = [19.1136, 72.8697];
  
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
    setMounted(true);
  }, []);

  const handleFitBounds = () => {
    const points: L.LatLngExpression[] = [];

    if (showReports) {
      reports
        .filter((r) => r.status !== 'Resolved' && isValidLatLng(r.coordinates))
        .forEach((r) => points.push([r.coordinates.lat, r.coordinates.lng]));
    }

    if (showAlerts) {
      alerts
        .filter((a) => a.status === 'active')
        .forEach((a) => {
          const lat = a.lat ?? a.latitude;
          const lng = a.lng ?? a.longitude;
          if (isValidLatLng({ lat, lng })) {
            points.push([lat, lng]);
          }
        });
    }

    if (showJourneys) {
      journeys.forEach((j) => {
        if (isValidLatLng(j.currentLocation)) {
          points.push([j.currentLocation.lat, j.currentLocation.lng]);
        }
      });
    }

    if (points.length > 0) {
      setMapBounds(L.latLngBounds(points));
    }
  };

  const handleCenterAlerts = () => {
    const points: L.LatLngExpression[] = [];
    alerts
      .filter((a) => a.status === 'active')
      .forEach((a) => {
        const lat = a.lat ?? a.latitude;
        const lng = a.lng ?? a.longitude;
        if (isValidLatLng({ lat, lng })) {
          points.push([lat, lng]);
        }
      });

    if (points.length > 0) {
      setMapBounds(L.latLngBounds(points));
    }
  };

  if (!mounted) return <div className="w-full h-full bg-slate-100 animate-pulse" />;

  // Generate heatmap points from high/medium risk reports
  const heatmapPoints: [number, number, number][] = reports
    .filter((r) => r.status !== 'Resolved' && isValidLatLng(r.coordinates))
    .map((r) => [
      r.coordinates.lat,
      r.coordinates.lng,
      r.severity === 'HIGH' || r.severity === 'CRITICAL' ? 1.0 : 0.5,
    ]);

  const validJourneysCount = journeys.filter((j) => isValidLatLng(j.currentLocation)).length;

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute top-4 left-4 z-[400] bg-card p-4 rounded-xl shadow-lg border border-[--border] w-56 space-y-3">
        <div className="flex items-center justify-between border-b border-[--border] pb-2 mb-2">
          <h3 className="text-sm font-bold">Map Layers</h3>
          <span className="text-[10px] text-muted-fg font-medium bg-muted px-2 py-0.5 rounded-full">Live</span>
        </div>

        <label className="flex items-center justify-between text-sm font-medium cursor-pointer">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={showAlerts} onChange={(e) => setShowAlerts(e.target.checked)} className="rounded border-primary/50 text-danger focus:ring-danger/50" />
            <span>Active SOS</span>
          </div>
          <span className="text-xs bg-danger text-white px-1.5 py-0.5 rounded-full">{alerts.filter(a => a.status === 'active').length}</span>
        </label>

        <label className="flex items-center justify-between text-sm font-medium cursor-pointer">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={showReports} onChange={(e) => setShowReports(e.target.checked)} className="rounded border-primary/50 text-warning focus:ring-warning/50" />
            <span>Incidents</span>
          </div>
          <span className="text-xs bg-warning text-warning-fg px-1.5 py-0.5 rounded-full">{reports.filter(r => r.status !== 'Resolved').length}</span>
        </label>

        <label className="flex items-center justify-between text-sm font-medium cursor-pointer">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={showJourneys} onChange={(e) => setShowJourneys(e.target.checked)} className="rounded border-primary/50 text-primary focus:ring-primary/50" />
            <span>Live Journeys</span>
          </div>
          <span className="text-xs bg-primary text-primary-fg px-1.5 py-0.5 rounded-full">
            {validJourneysCount}
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} className="rounded border-primary/50 text-primary focus:ring-primary/50" />
          <span>Incident Heatmap</span>
        </label>
      </div>

      <Map center={center} zoom={13}>
        <MapController bounds={mapBounds} />

        {showHeatmap && heatmapPoints.length > 0 && (
          <HeatmapLayer points={heatmapPoints} />
        )}

        {showReports && reports.filter(r => r.status !== 'Resolved' && isValidLatLng(r.coordinates)).map(report => (
          <Marker
            key={`report-${report.id}`}
            position={[report.coordinates.lat, report.coordinates.lng]}
            icon={incidentIcon}
            eventHandlers={{
              click: () => setActiveMarker({ type: 'incident', id: report.id, lat: report.coordinates.lat, lng: report.coordinates.lng, data: report })
            }}
          />
        ))}

        {showAlerts && alerts.filter(a => a.status === 'active').map((alert) => {
          const lat = alert.lat ?? alert.latitude;
          const lng = alert.lng ?? alert.longitude;
          if (!isValidLatLng({ lat, lng })) return null;

          return (
            <Marker
              key={`alert-${alert.id}`}
              position={[lat, lng]}
              icon={alertIcon}
              eventHandlers={{
                click: () => setActiveMarker({ type: 'alert', id: alert.id, lat, lng, data: alert })
              }}
            />
          );
        })}

        {showJourneys && journeys.map(journey => {
          if (!isValidLatLng(journey.currentLocation)) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                `[GuardianMap] Skipping journey with invalid or missing location: ID=${journey.id}`,
                journey.currentLocation
              );
            }
            return null;
          }

          return (
            <Marker
              key={`journey-${journey.id}`}
              position={[journey.currentLocation.lat, journey.currentLocation.lng]}
              icon={journeyIcon}
              eventHandlers={{
                click: () => setActiveMarker({
                  type: 'journey',
                  id: journey.id,
                  lat: journey.currentLocation!.lat,
                  lng: journey.currentLocation!.lng,
                  data: journey
                })
              }}
            />
          );
        })}

        <MapControls onFitBounds={handleFitBounds} onCenterAlerts={handleCenterAlerts} />
      </Map>

      {/* Render the detail panel if a marker is selected */}
      <MapDetailPanel marker={activeMarker} onClose={() => setActiveMarker(null)} />
    </div>
  );
}

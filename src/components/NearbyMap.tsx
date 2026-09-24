"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Shield, Cross, AlertTriangle, CheckCircle2, Phone, Navigation } from "lucide-react";
import { NearbyLocation } from "@/app/api/nearby/route";

interface NearbyMapProps {
  userLocation: [number, number] | null; // [lat, lng]
  locations: NearbyLocation[];
  selectedLocationId: string | null;
  onSelectLocation: (id: string) => void;
  category: string;
}

// Controller to smoothly pan to selected location or fit all markers
function MapController({
  userLocation,
  locations,
  selectedLocationId,
}: {
  userLocation: [number, number] | null;
  locations: NearbyLocation[];
  selectedLocationId: string | null;
}) {
  const map = useMap();
  const prevSelectedId = useRef<string | null>(null);

  useEffect(() => {
    if (selectedLocationId && selectedLocationId !== prevSelectedId.current) {
      prevSelectedId.current = selectedLocationId;
      const target = locations.find((l) => l.id === selectedLocationId);
      if (target) {
        map.flyTo([target.latitude, target.longitude], 16, { duration: 1.2 });
      }
    }
  }, [selectedLocationId, locations, map]);

  useEffect(() => {
    if (!selectedLocationId) {
      const bounds = L.latLngBounds([]);
      if (userLocation) {
        bounds.extend(userLocation);
      }
      locations.slice(0, 15).forEach((loc) => {
        bounds.extend([loc.latitude, loc.longitude]);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } else if (userLocation) {
        map.setView(userLocation, 14);
      }
    }
  }, [userLocation, locations, selectedLocationId, map]);

  return null;
}

// Create custom leaflet DivIcon based on category and selection
function createFacilityIcon(category: string, isSelected: boolean, index: number): L.DivIcon {
  let bgColor = "#3b82f6"; // police blue
  let symbol = "P";

  const lower = category.toLowerCase();
  if (lower.includes("hospital") || lower.includes("clinic") || lower.includes("medical")) {
    bgColor = "#ef4444"; // red
    symbol = "+";
  } else if (lower.includes("fire") || lower.includes("emergency")) {
    bgColor = "#f59e0b"; // amber
    symbol = "!";
  } else if (lower.includes("safe") || lower.includes("ngo")) {
    bgColor = "#10b981"; // emerald
    symbol = "✓";
  }

  const size = isSelected ? 36 : 28;
  const border = isSelected ? "3px solid white" : "2px solid rgba(255,255,255,0.9)";
  const shadow = isSelected
    ? "0 0 0 4px rgba(59, 130, 246, 0.4), 0 8px 16px rgba(0,0,0,0.3)"
    : "0 4px 8px rgba(0,0,0,0.2)";

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${bgColor};
      border-radius: 50%;
      border: ${border};
      box-shadow: ${shadow};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: ${isSelected ? 14 : 12}px;
      cursor: pointer;
      transform: translate(-50%, -50%);
      transition: all 0.2s ease;
    ">
      ${index + 1}
    </div>
  `;

  return L.divIcon({
    className: "custom-nearby-marker",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Custom DivIcon for user's real GPS position
function createUserLocationIcon(): L.DivIcon {
  const html = `
    <div style="position: relative; width: 22px; height: 22px; transform: translate(-50%, -50%);">
      <div style="
        position: absolute;
        inset: -8px;
        background-color: rgba(59, 130, 246, 0.25);
        border-radius: 50%;
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: 22px;
        height: 22px;
        background-color: #2563eb;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      "></div>
    </div>
  `;

  return L.divIcon({
    className: "custom-user-marker",
    html,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function NearbyMap({
  userLocation,
  locations,
  selectedLocationId,
  onSelectLocation,
  category,
}: NearbyMapProps) {
  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution =
    process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const center: [number, number] = userLocation || [19.076, 72.8777];

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-900">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={tileUrl} attribution={attribution} maxZoom={19} />

        <MapController
          userLocation={userLocation}
          locations={locations}
          selectedLocationId={selectedLocationId}
        />

        {/* User GPS Location Marker */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={createUserLocationIcon()}>
              <Popup>
                <div className="p-1 text-xs font-semibold text-slate-800">
                  <span className="font-bold text-blue-600 block">Your Current Location</span>
                  Lat: {userLocation[0].toFixed(5)}, Lng: {userLocation[1].toFixed(5)}
                </div>
              </Popup>
            </Marker>
            <Circle
              center={userLocation}
              radius={300}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.08,
                weight: 1,
                dashArray: "4, 4",
              }}
            />
          </>
        )}

        {/* Facility Markers */}
        {locations.map((loc, idx) => {
          const isSelected = loc.id === selectedLocationId;
          const icon = createFacilityIcon(loc.category, isSelected, idx);

          return (
            <Marker
              key={loc.id}
              position={[loc.latitude, loc.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectLocation(loc.id),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px] text-slate-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-sm leading-tight">{loc.name}</h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-2 leading-relaxed">{loc.address}</p>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-3 border-t border-slate-100 pt-1.5">
                    <span>
                      {loc.distanceMeters < 1000
                        ? `${loc.distanceMeters} m away`
                        : `${(loc.distanceMeters / 1000).toFixed(1)} km away`}
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {loc.operatingHours || "Open"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {loc.phone ? (
                      <a
                        href={`tel:${loc.phone}`}
                        className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 text-center transition-colors"
                      >
                        <Phone size={12} /> Call
                      </a>
                    ) : (
                      <span className="flex-1 py-1.5 px-2 bg-slate-100 text-slate-400 text-[11px] font-medium rounded-lg text-center">
                        No Phone
                      </span>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 text-center transition-colors"
                    >
                      <Navigation size={12} /> Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

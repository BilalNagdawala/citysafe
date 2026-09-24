'use client';

import React from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { X, ShieldAlert, AlertTriangle, MapPin, Navigation, Clock, User, CheckCircle2 } from 'lucide-react';
import { useGuardianData } from '@/providers/GuardianDataProvider';
import { isValidLatLng } from '@/lib/geo-utils';

interface MapDetailPanelProps {
  marker: any | null;
  onClose: () => void;
}

export default function MapDetailPanel({ marker, onClose }: MapDetailPanelProps) {
  const { acknowledgeAlert, resolveReport } = useGuardianData();

  if (!marker) return null;

  const handleAcknowledge = async () => {
    if (marker.type === 'alert') {
      await acknowledgeAlert(marker.id);
      onClose();
    } else if (marker.type === 'incident') {
      resolveReport(marker.id);
      onClose();
    }
  };

  const renderContent = () => {
    if (marker.type === 'alert') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${marker.data.severity === 'critical' ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'}`}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{marker.data.title || 'SOS Alert'}</h2>
              <p className="text-sm text-muted-fg font-medium">{marker.data.severity?.toUpperCase()} SEVERITY</p>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-xl space-y-2">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-muted-fg mt-0.5" />
              <div className="text-sm font-medium">
                <span className="text-muted-fg block text-xs">Reported at</span>
                {new Date(marker.data.timestamp || Date.now()).toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-fg mt-0.5" />
              <div className="text-sm font-medium">
                <span className="text-muted-fg block text-xs">Location</span>
                {marker.data.location || `${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`}
              </div>
            </div>
          </div>

          <p className="text-sm text-foreground/80 font-medium">{marker.data.description}</p>

          <div className="pt-4 flex flex-col gap-2">
            <button 
              onClick={handleAcknowledge}
              className="w-full bg-danger text-white py-3 rounded-xl font-bold hover:bg-danger/90 transition-colors"
            >
              Acknowledge & Respond
            </button>
            <button className="w-full bg-muted text-foreground py-3 rounded-xl font-bold hover:bg-muted/80 transition-colors">
              Call 112
            </button>
          </div>
        </div>
      );
    }

    if (marker.type === 'incident') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-warning/20 text-warning rounded-xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{marker.data.type || marker.data.category}</h2>
              <p className="text-sm text-muted-fg font-medium">Unverified Incident</p>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-xl space-y-2">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-muted-fg mt-0.5" />
              <div className="text-sm font-medium">
                <span className="text-muted-fg block text-xs">Reported</span>
                {marker.data.time || 'Recently'}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-fg mt-0.5" />
              <div className="text-sm font-medium">
                <span className="text-muted-fg block text-xs">Location</span>
                {marker.data.location || `${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`}
              </div>
            </div>
          </div>

          <p className="text-sm text-foreground/80 font-medium">{marker.data.description}</p>

          <div className="pt-4 flex flex-col gap-2">
            <button 
              onClick={handleAcknowledge}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={20} /> Mark Resolved
            </button>
            <button className="w-full bg-muted text-foreground py-3 rounded-xl font-bold hover:bg-muted/80 transition-colors">
              Assign Responders
            </button>
          </div>
        </div>
      );
    }

    if (marker.type === 'journey') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 text-primary rounded-xl">
              <Navigation size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Active Journey</h2>
              <p className="text-sm text-muted-fg font-medium">{marker.data.userName || 'Citizen User'}</p>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-xl space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-sm font-medium">
                <span className="text-muted-fg block text-xs">Current Location</span>
                {isValidLatLng({ lat: marker.lat, lng: marker.lng }) ? (
                  <span>Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}</span>
                ) : (
                  <span className="text-amber-500 font-medium">Location unavailable</span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-muted-fg mt-0.5" />
              <div className="text-sm font-medium">
                <span className="text-muted-fg block text-xs">Last Update</span>
                {marker.data?.lastUpdate || marker.data?.updatedAt ? (
                  new Date(marker.data.lastUpdate || marker.data.updatedAt).toLocaleTimeString()
                ) : (
                  'Waiting for location'
                )}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button className="w-full bg-muted text-foreground py-3 rounded-xl font-bold hover:bg-muted/80 transition-colors">
              Stop Monitoring
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Desktop Sidebar Panel */}
      <div className="hidden md:block absolute top-0 right-0 h-full w-[400px] bg-card border-l border-[--border] shadow-2xl z-[1000] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg">Details</h3>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div className="md:hidden">
        <BottomSheet defaultExpanded={true} onClose={onClose}>
          {renderContent()}
        </BottomSheet>
      </div>
    </>
  );
}

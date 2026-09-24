'use client';

import { useState } from 'react';
import { Navigation, MapPin, Clock, ShieldCheck, AlertCircle, EyeOff, User as UserIcon } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export default function GuardianJourneys() {
  const [journeys, setJourneys] = useState([
    {
      id: '1',
      user: 'Rahul M.',
      destination: 'Bandra West',
      eta: '4 min',
      score: 95,
      status: 'On Track',
      lastUpdate: 'Just now',
      warnings: 0,
      consent: true
    },
    {
      id: '2',
      user: 'Anita K.',
      destination: 'Powai',
      eta: '18 min',
      score: 72,
      status: 'Delayed',
      lastUpdate: '2 mins ago',
      warnings: 1,
      consent: true
    }
  ]);

  const handleRevoke = (id: string) => {
    setJourneys(journeys.map(j => j.id === id ? { ...j, consent: false, status: 'Access Revoked' } : j));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="p-4 md:px-8 md:py-6 shrink-0 bg-background/80 backdrop-blur-md border-b border-[--border] z-10 pt-[calc(16px+env(safe-area-inset-top))]">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Navigation className="text-blue-500" /> Active Journeys
        </h1>
        <p className="text-sm text-muted-fg mt-1">Live tracking of users who have granted you access.</p>
      </header>

      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Map Panel (Mock) */}
        <div className="flex-1 bg-muted/30 relative h-[40vh] md:h-auto border-b md:border-b-0 md:border-r border-[--border] overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-30 grayscale mix-blend-luminosity" />
          
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center flex-col pointer-events-none">
            <div className="w-16 h-16 bg-card border border-[--border] rounded-full shadow-lg flex items-center justify-center mb-4">
              <MapPin className="text-blue-500" size={28} />
            </div>
            <h3 className="font-bold text-lg text-foreground shadow-sm">Interactive Map View</h3>
            <p className="text-sm text-muted-fg max-w-sm mt-2 shadow-sm">
              Displays real-time user locations, routes, and nearby safe zones. Connected via Mapbox/Google Maps.
            </p>
          </div>
        </div>

        {/* Sidebar List */}
        <div className="w-full md:w-96 bg-[--background] flex flex-col shrink-0">
          <div className="p-4 border-b border-[--border] bg-muted/10">
            <h2 className="font-bold text-sm uppercase tracking-wider text-muted-fg">Monitored Users ({journeys.filter(j => j.consent).length})</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {journeys.map((journey) => (
              <GlassCard key={journey.id} className={`!p-0 overflow-hidden border ${!journey.consent ? 'opacity-50 grayscale' : 'border-[--glass-border]'}`}>
                <div className="p-4 border-b border-[--border]">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-fg">
                        <UserIcon size={16} />
                      </div>
                      <h4 className="font-bold text-foreground">{journey.user}</h4>
                    </div>
                    {journey.consent && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                        journey.status === 'On Track' ? 'bg-sage/10 text-sage' : 'bg-warning/10 text-warning'
                      }`}>
                        {journey.status}
                      </span>
                    )}
                  </div>
                  
                  {journey.consent ? (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-start gap-2 text-xs text-muted-fg">
                        <MapPin size={14} className="text-primary shrink-0" />
                        <span>En route to <strong className="text-foreground">{journey.destination}</strong></span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-fg bg-muted/50 p-2 rounded-lg">
                        <div className="flex items-center gap-1">
                          <Clock size={12} /> ETA: {journey.eta}
                        </div>
                        <div className="flex items-center gap-1">
                          <ShieldCheck size={12} className={journey.score > 80 ? 'text-sage' : 'text-warning'} /> 
                          Score: {journey.score}
                        </div>
                      </div>
                      {journey.warnings > 0 && (
                        <div className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-1 rounded-md">
                          <AlertCircle size={12} /> {journey.warnings} Route Warning(s)
                        </div>
                      )}
                      <p className="text-[10px] text-muted-fg/70 text-right">Updated {journey.lastUpdate}</p>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <EyeOff className="mx-auto mb-2 text-muted-fg" size={24} />
                      <p className="text-xs text-danger font-bold uppercase tracking-wider">Access Revoked by User</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {journey.consent && (
                  <div className="p-3 bg-muted/30 grid grid-cols-2 gap-2">
                    <button className="text-xs font-bold py-2 bg-[--background] border border-[--border] rounded text-foreground hover:bg-muted transition-colors">
                      Ping Status
                    </button>
                    <button 
                      onClick={() => handleRevoke(journey.id)}
                      className="text-xs font-bold py-2 bg-[--background] border border-[--border] rounded text-danger hover:bg-danger/10 transition-colors flex items-center justify-center gap-1"
                    >
                      <EyeOff size={12} /> Revoke Access
                    </button>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

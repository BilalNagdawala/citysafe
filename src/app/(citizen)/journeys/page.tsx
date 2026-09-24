'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin, Share2, Loader2, Navigation } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-muted flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  )
});

interface JourneyItem {
  id: string;
  userName?: string;
  status: 'active' | 'completed' | 'cancelled';
  destination?: { lat: number; lng: number; address?: string };
  routeScore?: number;
  eta?: string;
  createdAt: string;
  lastUpdate: string;
}

export default function Journeys() {
  const [journeys, setJourneys] = useState<JourneyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        const res = await fetch('/api/journeys?status=all');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.journeys)) {
            setJourneys(data.journeys);
          }
        }
      } catch (err) {
        console.error('Failed to fetch journeys:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJourneys();
  }, []);

  const activeJourneys = journeys.filter(j => j.status === 'active');
  const pastJourneys = journeys.filter(j => j.status !== 'active');

  return (
    <main className="h-full w-full relative overflow-hidden bg-slate-50 dark:bg-zinc-900">
      {/* Map Background (Visible mostly on Desktop) */}
      <div className="absolute inset-0 z-0 hidden md:block">
        <Map 
          routes={[]} 
          routeScores={[]} 
          selectedRouteIndex={null} 
          origin={undefined}
        />
      </div>

      {/* Journeys Panel */}
      <div className="absolute z-20 
          inset-0 w-full h-full bg-[--background] overflow-y-auto hide-scrollbar pb-[calc(80px+env(safe-area-inset-bottom))]
          md:inset-y-0 md:left-0 md:w-[420px] md:bg-card/95 md:backdrop-blur-xl md:border-r md:border-[--border] md:shadow-2xl md:pb-6"
      >
        <header className="p-5 pt-[calc(20px+env(safe-area-inset-top))] sticky top-0 bg-[--background]/90 md:bg-card/90 backdrop-blur-lg z-20 border-b border-[--glass-border] flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Journeys</h1>
          <ThemeToggle />
        </header>

        <div className="px-5 w-full flex flex-col gap-6 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <section>
                <SectionHeader title="Active Share" />
                {activeJourneys.length === 0 ? (
                  <EmptyState 
                    icon={Share2}
                    title="No active journey"
                    description="When you share your live location or route, it will appear here."
                    className="mb-2"
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {activeJourneys.map(journey => (
                      <GlassCard key={journey.id} className="!p-4 border-2 border-primary/40 bg-primary/5">
                        <div className="flex justify-between items-start mb-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Live Journey
                          </span>
                          {journey.routeScore && (
                            <span className="text-xs font-bold text-foreground">
                              {journey.routeScore}/100 Safety
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground text-base tracking-tight mb-1">
                          {journey.destination?.address || 'Active Destination'}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-fg">
                          <Navigation size={12} />
                          <span>Last updated: {new Date(journey.lastUpdate).toLocaleTimeString()}</span>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <SectionHeader title="Recent Journeys" />
                {pastJourneys.length === 0 ? (
                  <p className="text-xs text-muted-fg italic">No completed journeys recorded yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {pastJourneys.map(journey => (
                      <GlassCard key={journey.id} className="!p-4 border border-[--glass-border]">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2 text-muted-fg text-xs font-semibold">
                            <Clock size={14} />
                            {new Date(journey.createdAt).toLocaleDateString()}
                          </div>
                          {journey.routeScore && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-md border ${
                              journey.routeScore > 80 ? 'bg-primary/10 text-primary border-primary/20' : 
                              journey.routeScore > 70 ? 'bg-warning/10 text-warning border-warning/20' : 
                              'bg-danger/10 text-danger border-danger/20'
                            }`}>
                              {journey.routeScore} Safety
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-bold text-foreground text-base tracking-tight mb-1">
                          {journey.destination?.address || 'Journey Route'}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-muted-fg font-medium">
                          <MapPin size={14} />
                          <span>Status: {journey.status}</span>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

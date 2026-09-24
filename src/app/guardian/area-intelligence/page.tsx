'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { BrainCircuit, TrendingUp, AlertTriangle, Lightbulb, Map, Loader2 } from 'lucide-react';
import { MapComponent } from '@/components/guardian/MapComponent';

export default function AreaIntelligencePage() {
  const [range, setRange] = useState<'today' | '7d' | '30d'>('today');
  const [targetTime, setTargetTime] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/guardian/intelligence?range=${range}&targetTime=${targetTime.toISOString()}`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Failed to load area intelligence', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [range, targetTime]);

  const handleRangeChange = (newRange: 'today' | '7d' | '30d') => {
    setRange(newRange);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))] relative">
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div className="bg-card p-4 rounded-full shadow-lg border border-[--border] flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="font-bold text-sm text-foreground">Calculating metrics...</span>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-primary" /> Area Intelligence
          </h1>
          <p className="text-muted-fg font-medium mt-1">AI-driven safety analytics and risk prediction.</p>
        </div>
        
        <div className="flex gap-2 bg-card border border-[--border] p-1 rounded-xl shadow-sm overflow-x-auto">
          <button 
            onClick={() => handleRangeChange('today')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${range === 'today' ? 'bg-primary text-primary-fg shadow-sm' : 'hover:bg-muted text-muted-fg'}`}
          >
            Today
          </button>
          <button 
            onClick={() => handleRangeChange('7d')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${range === '7d' ? 'bg-primary text-primary-fg shadow-sm' : 'hover:bg-muted text-muted-fg'}`}
          >
            7 Days
          </button>
          <button 
            onClick={() => handleRangeChange('30d')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${range === '30d' ? 'bg-primary text-primary-fg shadow-sm' : 'hover:bg-muted text-muted-fg'}`}
          >
            30 Days
          </button>
        </div>
        
        <div className="flex gap-2">
           <input 
              type="datetime-local" 
              value={new Date(targetTime.getTime() - targetTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              onChange={(e) => {
                if (e.target.value) {
                  setTargetTime(new Date(e.target.value));
                }
              }}
              className="bg-card border border-[--border] p-2 rounded-xl shadow-sm focus-within:ring-2 ring-primary/20 text-sm font-medium text-foreground outline-none"
            />
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <GlassCard className="!p-5 border border-[--glass-border]">
          <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2">Overall Safety Score</h3>
          <div className="flex items-end gap-3 mb-2">
            <span className={`text-4xl font-black ${!metrics ? 'text-muted-fg' : metrics.score > 75 ? 'text-sage' : metrics.score > 65 ? 'text-warning' : 'text-danger'}`}>
              {metrics ? Math.round(metrics.score) : '--'}
            </span>
            <span className="text-sm font-bold text-muted-fg mb-1">/ 100</span>
          </div>
          <p className={`text-xs font-bold flex items-center gap-1 ${!metrics ? 'text-muted-fg' : metrics.trend.includes('+') ? 'text-sage' : 'text-danger'}`}>
            <TrendingUp size={14} className={metrics?.trend.includes('-') ? 'rotate-180' : ''} /> {metrics?.trend || 'Loading trend...'}
          </p>
        </GlassCard>

        <GlassCard className="!p-5 border border-[--glass-border]">
          <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2">High-Risk Time</h3>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-2xl font-black text-warning">{metrics?.timeWindow || '--:--'}</span>
          </div>
          <p className="text-xs font-medium text-muted-fg">
            {metrics?.timeText || 'Loading analysis...'}
          </p>
        </GlassCard>

        <GlassCard className="!p-5 border border-[--glass-border]">
          <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2">Primary Concern</h3>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-xl font-bold text-foreground">{metrics?.primaryConcern || '---'}</span>
          </div>
          <p className="text-xs font-medium text-muted-fg">
            {metrics?.concernText || 'Loading details...'}
          </p>
        </GlassCard>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="!p-0 border border-[--glass-border] overflow-hidden">
          <div className="p-4 border-b border-[--border] bg-muted/20">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Map size={18} className="text-primary" /> Incident Heatmap
            </h3>
          </div>
          <div className="p-2 relative">
            <MapComponent center={{ lat: 18.9660 + (range === '30d' ? 0.01 : range === '7d' ? -0.01 : 0), lng: 72.8170 }} height="300px" />
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="!p-5 border border-[--glass-border]">
            <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-warning" /> Emerging Hotspots
            </h3>
            <div className="space-y-4">
              {metrics?.hotspots?.length > 0 ? metrics.hotspots.map((hotspot: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-foreground">{hotspot.name}</span>
                    <span className={`font-bold ${hotspot.fillClass.replace('bg-', 'text-')}`}>{hotspot.risk}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className={`${hotspot.fillClass} h-1.5 rounded-full transition-all duration-1000`} style={{ width: `${Math.min(hotspot.fill, 100)}%` }}></div>
                  </div>
                  {hotspot.desc && <p className="text-xs text-muted-fg mt-1">{hotspot.desc}</p>}
                </div>
              )) : (
                <p className="text-sm text-muted-fg">No emerging hotspots detected in this timeframe.</p>
              )}
            </div>
          </GlassCard>

          <GlassCard className="!p-5 border border-[--glass-border] bg-primary/5 border-primary/20">
            <h3 className="font-bold text-foreground flex items-center gap-2 mb-2">
              <Lightbulb size={18} className="text-primary" /> AI Recommendation
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed transition-opacity">
              {metrics?.aiRec || 'Loading recommendation...'}
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

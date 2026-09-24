'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ShieldAlert, Activity, Users, Shield, CheckCircle2, MapPin, Bell, ChevronRight, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { MapComponent } from '@/components/guardian/MapComponent';
import { useGuardianData } from '@/providers/GuardianDataProvider';
import { DEMO_GUARDIAN_PROFILE, DEMO_STATS } from '@/lib/demo-data';

export default function GuardianCommandCenter() {
  const { alerts, reports, profile: storedProfile } = useGuardianData();
  const profile = storedProfile || DEMO_GUARDIAN_PROFILE;
  const stats = DEMO_STATS;

  // Mock markers for map based on demo data
  const mapMarkers: any[] = [
    ...reports.filter(r => r.status !== 'Resolved').map(r => ({
      id: r.id,
      lat: r.coordinates.lat,
      lng: r.coordinates.lng,
      type: r.severity === 'CRITICAL' || r.severity === 'HIGH' ? 'alert' : 'report',
      label: r.type
    })),
    // A couple of fake NGOs and Guardians for visual interest
    { id: 'ngo1', lat: 18.9680, lng: 72.8200, type: 'ngo', label: 'Safe Mumbai' },
    { id: 'g1', lat: 18.9640, lng: 72.8130, type: 'guardian', label: 'Rahul D.' }
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-sm font-bold text-muted-fg uppercase tracking-widest mb-1">Guardian Command Center</h1>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-foreground tracking-tight">{profile.assignedRegion}</h2>
            {profile.verified && (
              <span className="flex items-center gap-1 text-xs font-bold bg-sage/10 text-sage px-2 py-1 rounded-md border border-sage/20">
                <CheckCircle2 size={14} /> Active Zone
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="font-bold text-foreground">{profile.name}</div>
            <div className="text-xs text-muted-fg">{profile.organization}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0 font-bold text-xl uppercase">
            {profile.name.substring(0, 2)}
          </div>
        </div>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="!p-5 border border-[--glass-border] hover:border-primary/30 transition-colors group">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-110 transition-transform">
              <Shield size={20} />
            </div>
            <span className="text-2xl font-black text-foreground">{stats.totalReports}</span>
          </div>
          <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider">Total Reports</h3>
        </GlassCard>

        <GlassCard className="!p-5 border border-[--glass-border] hover:border-danger/30 transition-colors group">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-danger/10 text-danger rounded-lg group-hover:scale-110 transition-transform">
              <ShieldAlert size={20} />
            </div>
            <span className="text-2xl font-black text-foreground">{stats.activeAlerts}</span>
          </div>
          <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider">Active Alerts</h3>
        </GlassCard>

        <GlassCard className="!p-5 border border-[--glass-border] hover:border-warning/30 transition-colors group">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-warning/10 text-warning rounded-lg group-hover:scale-110 transition-transform">
              <Briefcase size={20} />
            </div>
            <span className="text-2xl font-black text-foreground">{stats.openCases}</span>
          </div>
          <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider">Open Cases</h3>
        </GlassCard>

        <GlassCard className="!p-5 border border-[--glass-border] hover:border-sage/30 transition-colors group">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-sage/10 text-sage rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-2xl font-black text-foreground">{stats.resolvedCases}</span>
          </div>
          <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider">Resolved</h3>
        </GlassCard>
      </div>

      {/* Main Layout Grid */}
      <div className="grid md:grid-cols-3 gap-6 pt-4">
        
        {/* Map & Map actions - 2 columns */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-[--border] rounded-2xl overflow-hidden p-1 shadow-sm relative group">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <span className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold border border-[--border] shadow-sm flex items-center gap-1 text-foreground">
                <MapPin size={14} className="text-primary" /> Live Operations Map
              </span>
            </div>
            <MapComponent center={{ lat: 18.9660, lng: 72.8170 }} zoom={15} height="450px" markers={mapMarkers} />
          </div>

          {/* Critical Alerts Below Map */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Bell size={18} className="text-danger" /> Priority Alerts
              </h3>
              <Link href="/guardian/alerts" className="text-xs font-bold text-primary hover:underline">View All</Link>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {alerts.map(alert => (
                <div key={alert.id} className="bg-danger/5 border border-danger/20 p-4 rounded-xl relative overflow-hidden group hover:bg-danger/10 transition-colors cursor-pointer">
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-danger" />
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      {alert.severity}
                    </span>
                    <span className="text-xs font-bold text-muted-fg">{alert.time}</span>
                  </div>
                  <h4 className="font-bold text-foreground mb-1">{alert.type}</h4>
                  <p className="text-xs text-muted-fg mb-3">{alert.message}</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-danger group-hover:translate-x-1 transition-transform">
                    Review Alert <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          
          {/* Quick Reports Feed */}
          <div className="bg-card border border-[--border] rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Reports Near You
              </h3>
              <Link href="/guardian/reports" className="text-xs font-bold text-primary hover:underline">All Reports</Link>
            </div>

            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.id} className="border-b border-[--border] pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm text-foreground line-clamp-1">{report.type}</h4>
                    <span className="text-[10px] font-bold text-muted-fg whitespace-nowrap ml-2">{report.time}</span>
                  </div>
                  <p className="text-xs text-muted-fg mb-2 flex items-center gap-1">
                    <MapPin size={12} /> {report.location}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      report.status === 'New' ? 'bg-primary/10 text-primary' : 
                      report.status === 'Assigned' ? 'bg-sage/10 text-sage' : 
                      'bg-warning/10 text-warning'
                    }`}>
                      {report.status}
                    </span>
                    {report.severity === 'HIGH' && (
                      <span className="text-[10px] font-bold text-danger border border-danger/30 px-2 py-0.5 rounded uppercase">High Severity</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <Link href="/guardian/reports" className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-muted/50 hover:bg-muted text-sm font-bold text-foreground rounded-xl transition-colors">
              Open Feed <ChevronRight size={16} />
            </Link>
          </div>

          {/* NGO Network Quick Link */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
              <Users size={120} />
            </div>
            <h3 className="font-bold text-foreground mb-2">Coordinate Response</h3>
            <p className="text-sm text-muted-fg mb-4">Connect with 12+ verified NGOs and response units in your area.</p>
            <Link href="/guardian/ngo-network" className="inline-flex items-center gap-2 text-sm font-bold bg-primary text-primary-fg px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              View Network
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

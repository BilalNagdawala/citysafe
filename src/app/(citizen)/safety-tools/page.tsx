'use client';

import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Phone,
  Navigation,
  Share2,
  Building,
  Activity,
  Bluetooth,
  Users,
  MapPin,
  AlertTriangle,
  Bell,
  UserCircle2,
  CheckCircle2,
  Map as MapIcon
} from 'lucide-react';
import { useOfflineRelay } from '@/hooks/useOfflineRelay';
import SOSButton from '@/components/SOSButton';
import { ReportIncidentSheet } from '@/components/safety/ReportIncidentSheet';
import { useState } from 'react';
import Link from 'next/link';
import { useActiveJourney } from '@/providers/ActiveJourneyProvider';

export default function SafetyCenterPage() {
  const { isOnline, bluetoothSupported, connectBluetoothMesh } = useOfflineRelay();
  const { activeJourney } = useActiveJourney();
  const [showReportSheet, setShowReportSheet] = useState(false);

  return (
    <main className="h-full w-full bg-[--background] overflow-y-auto pb-[calc(100px+env(safe-area-inset-bottom))] md:pb-8">
      {/* Container widened for desktop */}
      <div className="max-w-7xl mx-auto p-4 pt-12 md:p-8 md:pt-12 space-y-8 md:space-y-12">
        
        {/* A. Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-black tracking-tight mb-2 text-foreground">Safety Center</h1>
            <p className="text-muted-fg font-medium">Your essential tools for personal security and community safety.</p>
          </motion.div>
          
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 bg-sage/10 text-sage px-3 py-1.5 rounded-full border border-sage/20 text-sm font-bold">
              <MapPin size={16} /> Andheri East
            </div>
            <button className="p-2 rounded-full hover:bg-muted transition-colors text-muted-fg">
              <Bell size={20} />
            </button>
            <Link href="/profile" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-fg">
              <UserCircle2 size={24} />
            </Link>
          </div>
        </header>

        {/* B. Emergency Command Area */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-fg mb-4">Get Help Now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            
            {/* Left: Actions */}
            <div className="flex flex-col gap-4">
              <SOSButton inline={false} />

              <div className="grid grid-cols-2 gap-4">
                <a href="tel:112" className="bg-card border border-[--glass-border] p-4 md:p-5 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:shadow-md text-center group">
                  <div className="w-12 h-12 rounded-full bg-danger/10 group-hover:bg-danger/20 transition-colors flex items-center justify-center">
                    <Phone className="w-6 h-6 text-danger" />
                  </div>
                  <span className="font-bold text-sm text-foreground">Call 112</span>
                </a>

                <button className="bg-card border border-[--glass-border] p-4 md:p-5 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:shadow-md text-center group">
                  <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-primary" />
                  </div>
                  <span className="font-bold text-sm text-foreground">Share Location</span>
                </button>

                <button className="col-span-2 bg-card border border-[--glass-border] p-4 md:p-5 rounded-2xl flex items-center justify-between gap-3 active:scale-[0.98] transition-transform hover:shadow-md text-left group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-warning/10 group-hover:bg-warning/20 transition-colors flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <span className="font-bold text-base text-foreground block">Alert Trusted Contacts</span>
                      <span className="text-sm text-muted-fg mt-1 block">Send a silent alert to your emergency circle</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Right: Readiness Status (Desktop & Mobile) */}
            <div className="bg-primary/5 border border-primary/20 p-6 md:p-8 rounded-3xl flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <ShieldAlert size={160} />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-6 relative z-10">Emergency Readiness</h3>
              
              <div className="space-y-6 relative z-10 flex-1">
                <div className="flex items-center justify-between border-b border-[--glass-border] pb-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-primary" size={20} />
                    <span className="font-medium text-foreground">Current Location</span>
                  </div>
                  <span className="font-bold text-sm">Andheri East</span>
                </div>
                
                <div className="flex items-center justify-between border-b border-[--glass-border] pb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="text-sage" size={20} />
                    <span className="font-medium text-foreground">GPS Status</span>
                  </div>
                  <span className="flex items-center gap-1 font-bold text-sm text-sage">
                    <CheckCircle2 size={14} /> Active
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[--glass-border] pb-4">
                  <div className="flex items-center gap-3">
                    <Users className="text-primary" size={20} />
                    <span className="font-medium text-foreground">Trusted Contacts</span>
                  </div>
                  <span className="font-bold text-sm">3 Configured</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapIcon className="text-muted-fg" size={20} />
                    <span className="font-medium text-foreground">Last Update</span>
                  </div>
                  <span className="font-bold text-sm text-muted-fg">Just now</span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-[--glass-border] relative z-10 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-fg">System Status</span>
                <span className="bg-sage/10 text-sage px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">High Readiness</span>
              </div>
            </div>

          </div>
        </section>

        {/* C. STAY SAFE DURING A JOURNEY */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-fg mb-4">Stay Safe During a Journey</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/route" className="bg-card border border-[--glass-border] p-5 md:p-6 rounded-2xl text-left active:scale-[0.98] transition-transform hover:shadow-md flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0">
                  <Navigation className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Plan & Start Safe Route</h3>
                  <p className="text-sm text-muted-fg font-medium mt-1">Find the safest routes and navigate.</p>
                </div>
              </div>
            </Link>

            {activeJourney && (activeJourney.status === 'active' || activeJourney.status === 'paused') ? (
              <Link href="/active-journey" className="bg-card border-2 border-primary/40 bg-primary/5 p-5 md:p-6 rounded-2xl text-left active:scale-[0.98] transition-transform hover:shadow-md flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Live Tracking Active</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">View & Share Active Journey</h3>
                    <p className="text-sm text-muted-fg font-medium mt-0.5">To {activeJourney.destinationAddress || 'Destination'} • {activeJourney.etaMinutes} min</p>
                  </div>
                </div>
              </Link>
            ) : (
              <Link href="/explore" className="bg-card border border-[--glass-border] p-5 md:p-6 rounded-2xl text-left active:scale-[0.98] transition-transform hover:shadow-md flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors flex items-center justify-center shrink-0">
                    <MapIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Explore Safety Corridor</h3>
                    <p className="text-sm text-muted-fg font-medium mt-1">Inspect lighting and verified safe zones.</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </section>

        {/* D. FIND HELP NEARBY */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-fg mb-4">Find Help Nearby</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/nearby-help?category=police" className="bg-card border border-[--glass-border] p-5 md:p-6 rounded-2xl flex flex-col items-center text-center gap-4 active:scale-[0.98] transition-transform hover:shadow-md group">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors flex items-center justify-center">
                <ShieldAlert className="w-7 h-7 text-blue-500" />
              </div>
              <span className="font-bold text-sm md:text-base text-foreground">Police Stations</span>
            </Link>

            <Link href="/nearby-help?category=hospital" className="bg-card border border-[--glass-border] p-5 md:p-6 rounded-2xl flex flex-col items-center text-center gap-4 active:scale-[0.98] transition-transform hover:shadow-md group">
              <div className="w-14 h-14 rounded-full bg-red-500/10 group-hover:bg-red-500/20 transition-colors flex items-center justify-center">
                <Building className="w-7 h-7 text-red-500" />
              </div>
              <span className="font-bold text-sm md:text-base text-foreground">Hospitals</span>
            </Link>

            <Link href="/nearby-help?category=emergency" className="bg-card border border-[--glass-border] p-5 md:p-6 rounded-2xl flex flex-col items-center text-center gap-4 active:scale-[0.98] transition-transform hover:shadow-md group">
              <div className="w-14 h-14 rounded-full bg-warning/10 group-hover:bg-warning/20 transition-colors flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-warning" />
              </div>
              <span className="font-bold text-sm md:text-base text-foreground">Emergency Services</span>
            </Link>

            <Link href="/nearby-help?category=safe" className="bg-card border border-[--glass-border] p-5 md:p-6 rounded-2xl flex flex-col items-center text-center gap-4 active:scale-[0.98] transition-transform hover:shadow-md group">
              <div className="w-14 h-14 rounded-full bg-sage/10 group-hover:bg-sage/20 transition-colors flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-sage" />
              </div>
              <span className="font-bold text-sm md:text-base text-foreground">Safe Locations</span>
            </Link>
          </div>
        </section>

        {/* E. REPORT AND IMPROVE SAFETY */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-fg mb-4">Report and Improve Safety</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowReportSheet(true)}
              className="bg-card border border-[--glass-border] p-5 md:p-6 rounded-2xl text-left active:scale-[0.98] transition-transform hover:shadow-md flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-full bg-danger/10 group-hover:bg-danger/20 transition-colors flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-danger" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Report Incident</h3>
                <p className="text-sm text-muted-fg font-medium mt-1">Alert others with details and photos.</p>
              </div>
            </button>

            <Link href="/explore" className="bg-card border border-[--glass-border] p-5 md:p-6 rounded-2xl text-left active:scale-[0.98] transition-transform hover:shadow-md flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">View Area Safety & Reports</h3>
                <p className="text-sm text-muted-fg font-medium mt-1">Check real-time safety scores and incidents.</p>
              </div>
            </Link>
          </div>
        </section>

        {/* F. BLUETOOTH MESH */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-fg mb-4">Bluetooth Mesh</h2>
          <div className="bg-card border border-[--glass-border] p-5 md:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="md:max-w-2xl">
              <h3 className="text-lg font-bold text-foreground mb-1">Experimental Offline Relay</h3>
              <p className="text-sm text-muted-fg mb-2">Send emergency SOS alerts to nearby devices when you have no cellular network.</p>
              <p className="text-xs text-muted-fg italic">Note: Requires nearby users with CitySafe open and Bluetooth enabled. Range is limited to ~10-30 meters.</p>
            </div>

            <div className="space-y-4 md:w-72 shrink-0">
              <div className="flex items-center gap-2 text-sm opacity-50">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary' : 'bg-warning'}`} />
                <span className="font-medium text-foreground">
                  Network: {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <button
                onClick={connectBluetoothMesh}
                disabled={!bluetoothSupported}
                className={`w-full p-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors ${bluetoothSupported
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-muted text-muted-fg cursor-not-allowed opacity-50'
                  }`}
              >
                <Bluetooth className="w-4 h-4" />
                {bluetoothSupported ? 'Enable Bluetooth Relay' : 'Not Supported on Device'}
              </button>
            </div>
          </div>
        </section>

      </div>

      {showReportSheet && (
        <ReportIncidentSheet
          onClose={() => setShowReportSheet(false)}
          onSuccess={() => { }}
        />
      )}
    </main>
  );
}

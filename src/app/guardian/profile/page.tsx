'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { User, ShieldCheck, Phone, MapPin, Award, CheckCircle2, History, Edit2 } from 'lucide-react';
import { DEMO_GUARDIAN_PROFILE, DEMO_STATS } from '@/lib/demo-data';

import { useGuardianData } from '@/providers/GuardianDataProvider';

export default function GuardianProfilePage() {
  const { profile: storedProfile } = useGuardianData();
  const profile = storedProfile || DEMO_GUARDIAN_PROFILE;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <User className="text-primary" /> Profile
          </h1>
          <p className="text-muted-fg font-medium mt-1">Manage your identity and credentials.</p>
        </div>
      </header>

      <GlassCard className="!p-0 border border-[--glass-border] overflow-hidden">
        <div className="bg-primary/5 p-8 border-b border-[--glass-border] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-card border border-[--border] rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0 overflow-hidden font-bold text-4xl uppercase">
              {profile.name.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-foreground">{profile.name}</h2>
                <ShieldCheck className="text-primary" size={24} />
              </div>
              <p className="text-primary font-bold mb-2">{profile.role} • {profile.organization}</p>
              <div className="flex gap-2">
                <span className="bg-card text-foreground text-xs font-bold px-2 py-1 rounded border border-[--border] shadow-sm font-mono">ID: {profile.id}</span>
                <span className="bg-sage/10 text-sage text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} /> KYC Verified
                </span>
              </div>
            </div>
          </div>
          <button className="px-4 py-2 bg-card border border-[--border] text-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-muted flex items-center gap-2">
            <Edit2 size={16} /> Edit Details
          </button>
        </div>

        <div className="p-8 grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <Phone size={16} className="text-muted-fg" /> {profile.phone}
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <MapPin size={16} className="text-muted-fg" /> {profile.assignedRegion}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3">Verification Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-fg font-medium">Aadhaar (Masked)</span>
                  <span className="font-mono font-bold text-foreground">XXXX-XXXX-8921</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-fg font-medium">Clearance Level</span>
                  <span className="font-bold text-primary">Level 2 (Active Responder)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-fg font-medium">Last Background Check</span>
                  <span className="font-bold text-foreground">Oct 12, 2023</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3 flex items-center gap-2">
                <Award size={14} /> Service Record
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-muted/30 p-3 rounded-lg text-center border border-[--border]">
                  <div className="text-2xl font-black text-foreground mb-1">{DEMO_STATS.resolvedCases}</div>
                  <div className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">Cases Resolved</div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg text-center border border-[--border]">
                  <div className="text-2xl font-black text-foreground mb-1">42</div>
                  <div className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">Active Hours</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3 flex items-center gap-2">
                <History size={14} /> Recent Training
              </h3>
              <ul className="space-y-3">
                <li className="text-sm font-medium text-foreground flex justify-between items-center border-b border-[--border] pb-2">
                  <span>First Aid & CPR (Advanced)</span>
                  <span className="text-sage text-xs font-bold">Completed</span>
                </li>
                <li className="text-sm font-medium text-foreground flex justify-between items-center border-b border-[--border] pb-2">
                  <span>De-escalation Tactics</span>
                  <span className="text-sage text-xs font-bold">Completed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

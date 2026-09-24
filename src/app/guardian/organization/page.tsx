'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Building2, FileText, CheckCircle2, Users, MapPin, Globe, Mail, Phone, Edit2 } from 'lucide-react';
import { useGuardianData } from '@/providers/GuardianDataProvider';
import { DEMO_GUARDIAN_PROFILE } from '@/lib/demo-data';

export default function OrganizationPage() {
  const { ngos } = useGuardianData();
  const profile = DEMO_GUARDIAN_PROFILE;
  const ngo = ngos.find(n => n.name === profile.organization) || ngos[0];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="text-primary" /> Organization
          </h1>
          <p className="text-muted-fg font-medium mt-1">Manage your affiliated NGO or community group details.</p>
        </div>
      </header>

      <GlassCard className="!p-0 border border-[--glass-border] overflow-hidden">
        <div className="bg-primary/5 p-8 border-b border-[--glass-border] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-card border border-[--border] rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0">
              <Building2 size={40} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-foreground">{ngo.name}</h2>
                {ngo.verified && <CheckCircle2 className="text-sage" size={20} />}
              </div>
              <p className="text-primary font-bold mb-2">{ngo.focus}</p>
              <div className="flex gap-2">
                <span className="bg-card text-foreground text-xs font-bold px-2 py-1 rounded border border-[--border] shadow-sm">ID: NGO-9882</span>
                <span className="bg-sage/10 text-sage text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Verified Entity</span>
              </div>
            </div>
          </div>
          <button className="px-4 py-2 bg-card border border-[--border] text-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-muted flex items-center gap-2">
            <Edit2 size={16} /> Edit Profile
          </button>
        </div>

        <div className="p-8 grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin size={14} /> Service Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {ngo.locations.map(loc => (
                  <span key={loc} className="bg-muted text-foreground text-sm font-medium px-3 py-1 rounded-full">{loc}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={14} /> Core Services
              </h3>
              <ul className="space-y-2">
                {ngo.services.map(service => (
                  <li key={service} className="text-sm text-foreground font-medium flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {service}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={14} /> Personnel
              </h3>
              <p className="text-sm font-medium text-foreground">
                <span className="text-primary font-bold">{ngo.activeVolunteers}</span> active guardians and volunteers registered.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-3">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <Phone size={16} className="text-muted-fg" /> +91 80000 12345
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <Mail size={16} className="text-muted-fg" /> contact@safemumbai.org
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <Globe size={16} className="text-muted-fg" /> www.safemumbai.org
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

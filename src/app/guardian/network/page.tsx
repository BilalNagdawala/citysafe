'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Users, User, Building2, CheckCircle2, MapPin, MessageSquare, Briefcase, Phone } from 'lucide-react';
import { useGuardianData } from '@/providers/GuardianDataProvider';

export default function UnifiedNetworkPage() {
  const { guardians, ngos } = useGuardianData();
  const [tab, setTab] = useState<'guardians' | 'ngos'>('guardians');

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="text-primary" /> Response Network
          </h1>
          <p className="text-muted-fg font-medium mt-1">
            Connect with verified guardians and partner organizations in your zone.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-card border border-[--border] p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setTab('guardians')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === 'guardians' ? 'bg-primary text-primary-fg shadow-sm' : 'hover:bg-muted text-muted-fg'
            }`}
          >
            Guardian Responders ({guardians.length})
          </button>
          <button
            onClick={() => setTab('ngos')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === 'ngos' ? 'bg-primary text-primary-fg shadow-sm' : 'hover:bg-muted text-muted-fg'
            }`}
          >
            Partner NGOs ({ngos.length})
          </button>
        </div>
      </header>

      {tab === 'guardians' ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {guardians.map((guardian) => (
            <GlassCard
              key={guardian.id}
              className="!p-5 border border-[--glass-border] hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <User size={24} />
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                    guardian.status === 'Available'
                      ? 'bg-sage/10 text-sage'
                      : guardian.status === 'Responding'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-danger/10 text-danger'
                  }`}
                >
                  {guardian.status}
                </span>
              </div>

              <h3 className="font-bold text-foreground text-lg flex items-center gap-2 mb-1">
                {guardian.name}
                {guardian.verified && <CheckCircle2 size={16} className="text-sage" />}
              </h3>

              <p className="text-sm font-bold text-primary mb-3">{guardian.role}</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-muted-fg font-medium">
                  <Briefcase size={14} className="shrink-0" />
                  <span>{guardian.organization}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-fg font-medium">
                  <MapPin size={14} className="shrink-0" />
                  <span>{guardian.location}</span>
                </div>
              </div>

              <button className="w-full bg-muted/50 hover:bg-muted text-foreground py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                <MessageSquare size={16} /> Direct Message
              </button>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {ngos.map((ngo) => (
            <GlassCard
              key={ngo.id}
              className="!p-6 border border-[--glass-border] flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 size={24} />
                  </div>
                  {ngo.verified && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-sage/10 text-sage px-2 py-1 rounded uppercase tracking-wider">
                      <CheckCircle2 size={14} /> Verified Org
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-foreground mb-1">{ngo.name}</h2>
                <p className="text-sm font-bold text-primary mb-4">{ngo.focus}</p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm text-muted-fg">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    <span>{ngo.locations.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-fg">
                    <Users size={16} className="shrink-0" />
                    <span>{ngo.activeVolunteers} Active Volunteers</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-bold text-muted-fg uppercase tracking-wider mb-2">
                    Available Services
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ngo.services.map((service, i) => (
                      <span
                        key={i}
                        className="bg-muted/50 text-foreground text-xs font-bold px-3 py-1 rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[--glass-border]">
                <button className="flex-1 bg-primary text-primary-fg py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                  <MessageSquare size={16} /> Message
                </button>
                <button className="flex-1 bg-muted text-foreground py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors">
                  <Phone size={16} /> Emergency Contact
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

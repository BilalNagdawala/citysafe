'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Users, User, CheckCircle2, MapPin, MessageSquare, Briefcase } from 'lucide-react';
import { useGuardianData } from '@/providers/GuardianDataProvider';

export default function NetworkPage() {
  const { guardians } = useGuardianData();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="text-primary" /> Guardian Network
          </h1>
          <p className="text-muted-fg font-medium mt-1">Connect with other authorized guardians in your vicinity.</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {guardians.map((guardian) => (
          <GlassCard key={guardian.id} className="!p-5 border border-[--glass-border] hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <User size={24} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                guardian.status === 'Available' ? 'bg-sage/10 text-sage' :
                guardian.status === 'Responding' ? 'bg-warning/10 text-warning' :
                'bg-danger/10 text-danger'
              }`}>
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
    </div>
  );
}

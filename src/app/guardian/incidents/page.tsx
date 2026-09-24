'use client';

import { useState } from 'react';
import { Shield, MapPin, Clock, AlertTriangle, FileText, CheckCircle2, MessageSquare, ShieldAlert } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export default function GuardianIncidents() {
  const [incidents, setIncidents] = useState([
    {
      id: 'INC-209',
      category: 'Suspicious Activity',
      severity: 'medium',
      desc: 'Individual following women near the station exit.',
      coords: '19.1136, 72.8697',
      address: 'Andheri East Station, Gate 2',
      time: '1 hour ago',
      evidence: true,
      status: 'pending',
      privacy: 'Anonymous Reporter'
    },
    {
      id: 'INC-208',
      category: 'Streetlight Outage',
      severity: 'low',
      desc: 'Entire block is dark, making it unsafe for pedestrians.',
      coords: '19.0991, 72.8276',
      address: 'Juhu Tara Road',
      time: '3 hours ago',
      evidence: false,
      status: 'verified',
      privacy: 'Public Reporter'
    }
  ]);

  const handleAction = (id: string, action: string) => {
    setIncidents(incidents.map(inc => inc.id === id ? { ...inc, status: action } : inc));
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between border-b border-[--border] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Shield className="text-primary" /> Community Incidents
          </h1>
          <p className="text-sm text-muted-fg mt-1">Review and moderate crowd-sourced safety reports.</p>
        </div>
      </header>

      <div className="grid gap-6">
        {incidents.map(inc => (
          <GlassCard key={inc.id} className="!p-0 overflow-hidden border border-[--glass-border]">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-muted-fg">#{inc.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      inc.severity === 'high' ? 'bg-danger/10 text-danger' : 
                      inc.severity === 'medium' ? 'bg-warning/10 text-warning' : 
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {inc.severity} Priority
                    </span>
                    {inc.status === 'verified' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-sage bg-sage/10 px-2 py-0.5 rounded uppercase tracking-wider">
                        <CheckCircle2 size={10} /> Verified
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{inc.category}</h3>
                </div>
                {inc.evidence && (
                  <div className="bg-muted/50 p-2 rounded-lg text-xs font-bold text-muted-fg flex items-center gap-1 border border-[--border]">
                    <FileText size={14} /> Evidence Attached
                  </div>
                )}
              </div>

              <div className="bg-muted/30 p-4 rounded-xl border border-[--glass-border] mb-4">
                <p className="text-sm text-foreground italic">"{inc.desc}"</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-fg mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><MapPin size={16} className="text-primary" /> {inc.address}</div>
                  <div className="flex items-center gap-2 ml-6 text-xs">{inc.coords}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Clock size={16} /> Reported {inc.time}</div>
                  <div className="flex items-center gap-2"><ShieldAlert size={16} /> {inc.privacy}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-[--border] p-3 bg-muted/10 flex flex-wrap gap-2">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-[--background] border border-[--border] text-foreground rounded-lg font-bold text-sm hover:bg-muted">
                <MessageSquare size={16} /> Add Notes
              </button>
              {inc.status !== 'verified' && (
                <button 
                  onClick={() => handleAction(inc.id, 'verified')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-sage/10 text-sage rounded-lg font-bold text-sm hover:bg-sage/20"
                >
                  <CheckCircle2 size={16} /> Mark Verified
                </button>
              )}
              <button 
                onClick={() => handleAction(inc.id, 'spam')}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-[--background] border border-[--border] text-danger rounded-lg font-bold text-sm hover:bg-danger/10"
              >
                <AlertTriangle size={16} /> Mark Spam / Dup
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

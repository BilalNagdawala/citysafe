'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { BellRing, Check, ShieldAlert, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { useGuardianData } from '@/providers/GuardianDataProvider';

export default function AlertsPage() {
  const { alerts, acknowledgeAlert } = useGuardianData();

  const activeAlerts = alerts.filter((a: any) => a.status === 'active');
  const pastAlerts = alerts.filter((a: any) => a.status !== 'active');

  const handleAcknowledgeAll = () => {
    activeAlerts.forEach((a: any) => acknowledgeAlert(a.id));
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <BellRing className="text-danger" /> Alert Center
          </h1>
          <p className="text-muted-fg font-medium mt-1">Real-time critical safety notifications for your zone.</p>
        </div>
        {activeAlerts.length > 0 && (
          <button 
            onClick={handleAcknowledgeAll}
            className="bg-muted text-foreground px-4 py-2 rounded-xl font-bold text-sm hover:bg-muted/80"
          >
            Acknowledge All
          </button>
        )}
      </header>

      {activeAlerts.length === 0 && pastAlerts.length === 0 && (
        <div className="text-center p-12 text-muted-fg font-medium">
          No alerts found.
        </div>
      )}

      <div className="space-y-4">
        {activeAlerts.map((alert: any) => (
          <GlassCard key={alert.id} className="!p-0 border border-danger/30 overflow-hidden shadow-sm relative group">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-danger" />
            <div className="p-6 pl-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-danger/10 text-danger rounded-lg">
                    {alert.severity === 'critical' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                        {alert.severity}
                      </span>
                      <span className="text-xs font-bold text-muted-fg flex items-center gap-1">
                        <Clock size={12} /> {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-lg mt-1">{alert.title || alert.type}</h3>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 font-medium ml-12">{alert.description || alert.message}</p>
                <div className="text-xs text-muted-fg ml-12 mt-2 font-bold flex items-center gap-1">
                  Location: {alert.location}
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto ml-12 md:ml-0">
                <a href="/guardian/map" className="flex-1 md:flex-none text-center bg-danger text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-danger/90">
                  Respond
                </a>
                <button 
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="flex-1 md:flex-none bg-muted text-foreground px-4 py-2 rounded-lg font-bold text-sm hover:bg-muted/80 flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Acknowledge
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
        
        {pastAlerts.length > 0 && <h3 className="font-bold text-muted-fg mt-8 mb-4">Past Alerts</h3>}

        {pastAlerts.map((alert: any) => (
          <GlassCard key={alert.id} className="!p-6 border border-[--glass-border] opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted text-muted-fg rounded-lg">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground line-through">{alert.title || alert.type}</h3>
                  <span className="text-xs text-muted-fg">{alert.status === 'resolved' ? 'Resolved' : 'Acknowledged'} at {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

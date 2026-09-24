'use client';

import { useState } from 'react';
import { Activity, Clock, MapPin, Check, X, ShieldAlert, Heart, Car } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'resolved' | 'declined';

export default function GuardianRequests() {
  const [requests, setRequests] = useState([
    {
      id: 'REQ-1',
      type: 'Emotional Support',
      requester: 'Amit D.',
      location: 'Bandra West (Home)',
      time: '15 mins ago',
      priority: 'medium',
      status: 'pending' as RequestStatus,
      icon: Heart
    },
    {
      id: 'REQ-2',
      type: 'Transport Assistance',
      requester: 'Sneha R.',
      location: 'Andheri East Station',
      time: '32 mins ago',
      priority: 'high',
      status: 'in_progress' as RequestStatus,
      icon: Car
    }
  ]);

  const updateStatus = (id: string, newStatus: RequestStatus) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch(status) {
      case 'pending': return <span className="bg-warning/10 text-warning px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Pending</span>;
      case 'accepted': return <span className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Accepted</span>;
      case 'in_progress': return <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">In Progress</span>;
      case 'resolved': return <span className="bg-sage/10 text-sage px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Resolved</span>;
      case 'declined': return <span className="bg-danger/10 text-danger px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Declined</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between border-b border-[--border] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Activity className="text-warning" /> Support Requests
          </h1>
          <p className="text-sm text-muted-fg mt-1">Manage non-emergency support requests from users.</p>
        </div>
      </header>

      <div className="grid gap-4">
        {requests.map(req => (
          <GlassCard key={req.id} className="!p-0 overflow-hidden border border-[--glass-border]">
            <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-foreground shrink-0 border border-[--glass-border]">
                  <req.icon size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-muted-fg">#{req.id}</span>
                    {getStatusBadge(req.status)}
                    {req.priority === 'high' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-danger bg-danger/10 px-2 py-0.5 rounded">
                        <ShieldAlert size={10} /> High Priority
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{req.type}</h3>
                  <div className="text-sm text-muted-fg mt-1 space-y-1">
                    <div className="flex items-center gap-1"><MapPin size={14} /> {req.location}</div>
                    <div className="flex items-center gap-1"><Clock size={14} /> {req.time} by {req.requester}</div>
                  </div>
                </div>
              </div>

              {/* Actions based on status */}
              <div className="w-full md:w-auto flex flex-col gap-2">
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateStatus(req.id, 'accepted')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-primary text-primary-fg rounded-lg font-bold text-sm hover:bg-primary/90"
                    >
                      <Check size={16} /> Accept
                    </button>
                    <button 
                      onClick={() => updateStatus(req.id, 'declined')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-[--background] border border-[--border] text-muted-fg rounded-lg font-bold text-sm hover:text-danger hover:border-danger/50"
                    >
                      <X size={16} /> Decline
                    </button>
                  </div>
                )}

                {req.status === 'accepted' && (
                  <button 
                    onClick={() => updateStatus(req.id, 'in_progress')}
                    className="w-full flex items-center justify-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600"
                  >
                    Start Request
                  </button>
                )}

                {req.status === 'in_progress' && (
                  <button 
                    onClick={() => updateStatus(req.id, 'resolved')}
                    className="w-full flex items-center justify-center gap-1 px-4 py-2 bg-sage text-sage-fg rounded-lg font-bold text-sm hover:bg-sage/90"
                  >
                    <Check size={16} /> Mark Resolved
                  </button>
                )}
                
                {req.status === 'resolved' && (
                  <div className="px-4 py-2 text-sm text-muted-fg italic text-center md:text-right">
                    Resolution documented.
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

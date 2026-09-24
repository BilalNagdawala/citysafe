'use client';

import { useState } from 'react';
import { Users, UserPlus, Shield, Settings2, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

type UserStatus = 'active' | 'pending' | 'revoked';

export default function GuardianUsers() {
  const [users, setUsers] = useState([
    {
      id: 'U-1',
      name: 'Priya S.',
      phone: '+91 98765 43210',
      relation: 'Family',
      status: 'active' as UserStatus,
      permissions: ['Location', 'SOS Alerts', 'Audio'],
      priority: true
    },
    {
      id: 'U-2',
      name: 'Rahul M.',
      phone: '+91 91234 56789',
      relation: 'Friend',
      status: 'pending' as UserStatus,
      permissions: ['Location', 'SOS Alerts'],
      priority: false
    },
    {
      id: 'U-3',
      name: 'Anita K.',
      phone: '+91 99887 76655',
      relation: 'Colleague',
      status: 'revoked' as UserStatus,
      permissions: [],
      priority: false
    }
  ]);

  const handleAction = (id: string, action: UserStatus) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: action } : u));
  };

  const removeUser = (id: string) => {
    if (confirm('Are you sure you want to remove this connection?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[--border] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="text-primary" /> Connected Users
          </h1>
          <p className="text-sm text-muted-fg mt-1">Manage people who have added you as their guardian.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-fg rounded-lg font-bold text-sm hover:bg-primary/90">
          <UserPlus size={16} /> Invite User
        </button>
      </header>

      <div className="grid gap-4">
        {users.map(user => (
          <GlassCard key={user.id} className="!p-0 overflow-hidden border border-[--glass-border]">
            <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-foreground shrink-0 border border-[--glass-border] font-bold text-lg">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-foreground">{user.name}</h3>
                    {user.priority && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-danger bg-danger/10 px-2 py-0.5 rounded">
                        <ShieldAlert size={10} /> Priority
                      </span>
                    )}
                    {user.status === 'pending' && (
                      <span className="text-[10px] font-bold uppercase text-warning bg-warning/10 px-2 py-0.5 rounded">Pending Invite</span>
                    )}
                    {user.status === 'revoked' && (
                      <span className="text-[10px] font-bold uppercase text-danger bg-danger/10 px-2 py-0.5 rounded">Access Revoked</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-fg flex flex-wrap gap-x-3 gap-y-1">
                    <span>{user.relation}</span>
                    <span className="hidden md:inline">•</span>
                    <span>{user.phone}</span>
                  </div>
                </div>
              </div>

              {/* Actions based on status */}
              <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                {user.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => handleAction(user.id, 'active')}
                      className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-sage text-sage-fg rounded-lg font-bold text-sm hover:bg-sage/90"
                    >
                      <Check size={16} /> Accept
                    </button>
                    <button 
                      onClick={() => handleAction(user.id, 'revoked')}
                      className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-[--background] border border-[--border] text-muted-fg rounded-lg font-bold text-sm hover:text-danger hover:border-danger/50"
                    >
                      <X size={16} /> Reject
                    </button>
                  </>
                ) : (
                  <>
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[--background] border border-[--border] text-foreground rounded-lg font-bold text-sm hover:bg-muted disabled:opacity-50" disabled={user.status === 'revoked'}>
                      <Settings2 size={16} /> Permissions
                    </button>
                    <button 
                      onClick={() => removeUser(user.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[--background] border border-[--border] text-danger rounded-lg font-bold text-sm hover:bg-danger/10"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </>
                )}
              </div>

            </div>

            {/* Permissions summary */}
            {user.status === 'active' && (
              <div className="border-t border-[--border] p-3 bg-muted/10 flex items-center gap-2 text-xs text-muted-fg">
                <Shield size={14} className="text-primary" />
                <span className="font-bold">Granted Access:</span>
                <div className="flex gap-2">
                  {user.permissions.map(p => (
                    <span key={p} className="bg-[--background] border border-[--glass-border] px-2 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ShieldCheck, MapPin, Navigation, EyeOff, Loader2 } from 'lucide-react';

export default function GuardianFlow() {
  const [role, setRole] = useState<'user' | 'guardian' | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [locationShared, setLocationShared] = useState(false);
  
  if (role === null) {
    return (
      <div className="bg-card border border-border p-5 rounded-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold">Trusted Guardian</h3>
            <p className="text-xs text-muted-fg">Request volunteer support or become a guardian.</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-primary opacity-50" />
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button 
            onClick={() => setRole('user')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-fg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Navigation className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm">Need Help</span>
          </button>
          
          <button 
            onClick={() => setRole('guardian')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-fg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm">Be Guardian</span>
          </button>
        </div>
        
        <p className="text-[10px] text-muted-fg mt-4 text-center">
          * Demo mode. No real data is transmitted to NGOs.
        </p>
      </div>
    );
  }

  if (role === 'user') {
    return (
      <div className="bg-card border border-border p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
          <h3 className="font-bold">Request Guardian</h3>
          <button onClick={() => setRole(null)} className="text-xs text-muted-fg hover:text-foreground">Back</button>
        </div>
        
        {!isSharing ? (
          <div className="space-y-4">
            <div className="bg-secondary/50 p-3 rounded-xl border border-border text-sm text-muted-fg">
              <p className="mb-2"><strong>Privacy Notice:</strong> By starting a session, a verified Guardian will be able to view your live location and journey status.</p>
              <p>You can revoke access at any time.</p>
            </div>
            
            <button 
              onClick={() => {
                setIsSharing(true);
                setTimeout(() => setLocationShared(true), 1500);
              }}
              className="w-full bg-primary text-primary-fg p-3 rounded-xl font-bold active:scale-95 transition-transform"
            >
              Consent & Find Guardian
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {!locationShared ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-medium">Connecting to nearest Guardian...</p>
              </div>
            ) : (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    A
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Anita (Verified NGO)</p>
                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                      <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span>Monitoring your safety</span>
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setIsSharing(false);
                    setLocationShared(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-danger/10 text-danger hover:bg-danger/20 p-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  <EyeOff className="w-4 h-4" /> Revoke Access
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Guardian Role View
  return (
    <div className="bg-card border border-border p-5 rounded-2xl">
      <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
        <h3 className="font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Guardian Dashboard
        </h3>
        <button onClick={() => setRole(null)} className="text-xs text-muted-fg hover:text-foreground">Back</button>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-muted-fg mb-2">Active Support Requests (Demo)</p>
        
        <div className="bg-secondary/50 p-4 rounded-xl border border-border">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-bold text-sm">Anonymous User #842</p>
              <p className="text-xs text-muted-fg flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> Bandra West, Mumbai
              </p>
            </div>
            <span className="bg-danger/20 text-danger text-[10px] uppercase font-bold px-2 py-1 rounded">Urgent</span>
          </div>
          
          <div className="flex gap-2">
            <button className="flex-1 bg-primary text-primary-fg text-xs font-semibold p-2 rounded-lg active:scale-95 transition-transform">
              View Map
            </button>
            <button className="flex-1 bg-background border border-border text-foreground text-xs font-semibold p-2 rounded-lg hover:bg-muted transition-colors">
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

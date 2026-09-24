'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useShakeDetection } from '@/hooks/useShakeDetection';
import { ShieldAlert } from 'lucide-react';

interface ShakeSOSContextType {
  enabled: boolean;
  permissionGranted: boolean | null;
  error: string | null;
  toggleShake: () => void;
  requestPermission: () => Promise<void>;
}

const ShakeSOSContext = createContext<ShakeSOSContextType | null>(null);

export function useShakeSOS() {
  const context = useContext(ShakeSOSContext);
  if (!context) {
    throw new Error('useShakeSOS must be used within a ShakeSOSProvider');
  }
  return context;
}

export function ShakeSOSProvider({ children }: { children: React.ReactNode }) {
  const [shakeConfirm, setShakeConfirm] = useState(false);
  const [shakeCountdown, setShakeCountdown] = useState(5);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleShake = () => {
    if (shakeConfirm) return; // Prevent multiple triggers
    setShakeConfirm(true);
    setShakeCountdown(5);
    countdownTimerRef.current = setInterval(() => {
      setShakeCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          window.location.href = "tel:112";
          setShakeConfirm(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelShakeSOS = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setShakeConfirm(false);
  };

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }
  }, []);

  const { enabled, toggleShake, permissionGranted, error, requestPermission } = useShakeDetection({
    onShake: handleShake,
    threshold: 25
  });

  return (
    <ShakeSOSContext.Provider value={{ enabled, permissionGranted, error, toggleShake, requestPermission }}>
      {children}

      {/* Global Shake Confirmation Dialog */}
      {shakeConfirm && (
        <div className="fixed inset-0 z-[10000] bg-zinc-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white">
          <ShieldAlert className="w-16 h-16 text-danger mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">SOS Triggered</h2>
          <p className="text-center text-zinc-300 mb-2">Calling emergency services in...</p>
          <div className="text-6xl font-black text-danger mb-8 tabular-nums">{shakeCountdown}s</div>
          
          <div className="w-full max-w-xs space-y-4">
            <button 
              onClick={() => {
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                setShakeConfirm(false);
                window.location.href = "tel:112";
              }}
              className="w-full bg-danger text-white p-4 rounded-xl font-bold text-lg active:scale-95 transition-transform"
            >
              Call Now
            </button>
            <button 
              onClick={cancelShakeSOS}
              className="w-full bg-zinc-800 text-white p-4 rounded-xl font-bold active:scale-95 transition-transform border border-zinc-700"
            >
              Cancel (Undo)
            </button>
          </div>
        </div>
      )}
    </ShakeSOSContext.Provider>
  );
}

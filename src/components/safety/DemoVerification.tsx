'use client';

import { useState } from 'react';
import { UserCheck, Shield, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type VerificationState = 'idle' | 'pending' | 'verified' | 'failed';

export default function DemoVerification() {
  const [status, setStatus] = useState<VerificationState>('idle');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const startDemoVerification = () => {
    setStatus('pending');
    setTimeout(() => {
      // Simulate success for demo purposes
      setStatus('verified');
    }, 3000);
  };

  const reset = () => setStatus('idle');

  return (
    <div className="bg-card border border-border p-5 rounded-2xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            Guardian Verification <span className="bg-warning/20 text-warning-fg text-[10px] uppercase px-1.5 py-0.5 rounded">Demo</span>
          </h3>
          <p className="text-xs text-muted-fg mt-1">Simulated eKYC flow for safety volunteers.</p>
        </div>
        <UserCheck className="w-5 h-5 text-primary opacity-50" />
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="bg-secondary/50 p-4 rounded-xl border border-border">
              <div className="flex gap-3 items-start">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-fg">
                  <p className="mb-2">To become a trusted Guardian, identity verification is required.</p>
                  
                  {!showPrivacy ? (
                    <button 
                      onClick={() => setShowPrivacy(true)}
                      className="text-primary font-medium text-xs hover:underline"
                    >
                      View Privacy Policy
                    </button>
                  ) : (
                    <div className="bg-background p-3 rounded-lg border border-border text-[11px] mt-2 space-y-2">
                      <p><strong>Privacy Commitment:</strong></p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>We use an official eKYC provider.</li>
                        <li>Aadhaar numbers are <strong>never</strong> collected, stored, or displayed on your device.</li>
                        <li>Verification happens server-side only.</li>
                      </ul>
                      <button 
                        onClick={() => setShowPrivacy(false)}
                        className="text-primary font-medium mt-1 hover:underline"
                      >
                        Hide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={startDemoVerification}
              className="w-full bg-foreground text-background p-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <KeyRound className="w-4 h-4" /> Start Demo Verification
            </button>
          </motion.div>
        )}

        {status === 'pending' && (
          <motion.div 
            key="pending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <h4 className="font-bold mb-1">Verifying Identity</h4>
            <p className="text-xs text-muted-fg">Connecting to mock eKYC provider...</p>
          </motion.div>
        )}

        {status === 'verified' && (
          <motion.div 
            key="verified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-sage" />
            </div>
            <h4 className="font-bold text-lg mb-1">Identity Verified</h4>
            <p className="text-sm text-muted-fg mb-6">You can now access the Guardian Dashboard.</p>
            <button 
              onClick={reset}
              className="text-xs text-primary font-medium hover:underline"
            >
              Reset Demo
            </button>
          </motion.div>
        )}

        {status === 'failed' && (
          <motion.div 
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-danger" />
            </div>
            <h4 className="font-bold text-lg mb-1">Verification Failed</h4>
            <p className="text-sm text-muted-fg mb-6">Mock verification declined.</p>
            <button 
              onClick={reset}
              className="bg-secondary text-secondary-fg px-4 py-2 rounded-lg text-sm font-medium"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

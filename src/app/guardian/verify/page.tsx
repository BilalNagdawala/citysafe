'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, CheckCircle2, Clock, FileWarning, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export default function GuardianVerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'pending_admin' | 'approved'>('verifying');

  useEffect(() => {
    // Simulate OTP verification and admin approval workflow
    const timer1 = setTimeout(() => {
      setStatus('pending_admin');
    }, 2000);

    const timer2 = setTimeout(() => {
      setStatus('approved');
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[--background] flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md !p-8 text-center space-y-6">
        
        <div className="flex justify-center mb-4">
          {status === 'verifying' && (
            <div className="relative">
              <Shield className="w-20 h-20 text-primary opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
          {status === 'pending_admin' && (
            <Clock className="w-20 h-20 text-warning" />
          )}
          {status === 'approved' && (
            <CheckCircle2 className="w-20 h-20 text-sage" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          {status === 'verifying' && 'Verifying Identity...'}
          {status === 'pending_admin' && 'Identity Verified'}
          {status === 'approved' && 'Guardian Approved!'}
        </h1>

        <div className="text-muted-fg space-y-2 text-sm">
          {status === 'verifying' && (
            <p>We are securely verifying your Aadhaar details via OTP. Please do not close this window.</p>
          )}
          {status === 'pending_admin' && (
            <>
              <p>Your Aadhaar identity has been successfully verified.</p>
              <p>Your organization affiliation is now pending admin approval. This usually takes 24-48 hours.</p>
            </>
          )}
          {status === 'approved' && (
            <p>Your profile and organization have been verified. Welcome to the Guardian Command Center.</p>
          )}
        </div>

        {status === 'pending_admin' && (
          <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl text-left mt-6 flex gap-3">
            <FileWarning className="text-warning shrink-0" />
            <p className="text-xs text-warning-fg">
              While waiting for admin approval, you can access the dashboard with restricted read-only permissions.
            </p>
          </div>
        )}

        <div className="pt-4">
          <button 
            onClick={() => router.push('/guardian')}
            disabled={status === 'verifying'}
            className="w-full bg-primary text-primary-fg px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Go to Command Center <ArrowRight size={20} />
          </button>
        </div>

      </GlassCard>
    </div>
  );
}

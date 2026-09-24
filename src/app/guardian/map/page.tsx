'use client';

import dynamic from 'next/dynamic';

const GuardianMap = dynamic(() => import('@/components/guardian/GuardianMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[100dvh] flex items-center justify-center bg-slate-100">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  )
});

export default function GuardianMapPage() {
  return (
    <div className="h-full w-full">
      <GuardianMap />
    </div>
  );
}

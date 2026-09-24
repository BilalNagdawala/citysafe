'use client';

import ResponsiveNav from '@/components/ResponsiveNav';
import RoleGuard from '@/components/RoleGuard';

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['user']}>
      <div className="flex h-[100dvh] w-full bg-[--background]">
        <ResponsiveNav />
        <main className="flex-1 relative overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}

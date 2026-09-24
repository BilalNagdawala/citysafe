'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useRole } from '@/providers/RoleProvider';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('user' | 'guardian')[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { role, isLoading } = useRole();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (pathname === '/') {
      if (role === 'user') router.replace('/home');
      else if (role === 'guardian') router.replace('/guardian');
    } else {
      if (role === 'unassigned') {
        router.replace('/');
      } else if (role === 'user' && pathname.startsWith('/guardian')) {
        router.replace('/home');
      } else if (role === 'guardian' && !pathname.startsWith('/guardian')) {
        router.replace('/guardian');
      }
    }
  }, [role, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[--background] h-[100dvh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Prevent flashing content while redirecting
  if (pathname === '/' && role !== 'unassigned') return null;
  if (pathname !== '/' && role === 'unassigned') return null;
  if (role === 'user' && pathname.startsWith('/guardian')) return null;
  if (role === 'guardian' && !pathname.startsWith('/guardian')) return null;
  
  if (allowedRoles && role !== 'unassigned' && !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}

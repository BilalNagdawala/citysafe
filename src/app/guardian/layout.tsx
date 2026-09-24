'use client';

import RoleGuard from '@/components/RoleGuard';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, BellRing, Navigation, Activity, User, LogOut, Settings, Map, FileText, Briefcase, BarChart2, Users, Building2, BrainCircuit, Menu } from 'lucide-react';
import { useRole } from '@/providers/RoleProvider';
import { GuardianDataProvider } from '@/providers/GuardianDataProvider';
import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setRole } = useRole();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Exclude the registration page from the dashboard layout
  if (pathname === '/guardian/register') {
    return <RoleGuard>{children}</RoleGuard>;
  }

  const navItems = [
    { href: '/guardian', icon: Shield, label: 'Dashboard' },
    { href: '/guardian/map', icon: Map, label: 'Live Map' },
    { href: '/guardian/alerts', icon: BellRing, label: 'Alerts' },
    { href: '/guardian/intelligence', icon: BrainCircuit, label: 'Area Intelligence' },
    { href: '/guardian/reports', icon: FileText, label: 'Reports' },
    { href: '/guardian/cases', icon: Briefcase, label: 'Cases' },
    { href: '/guardian/network', icon: Building2, label: 'Network' },
    { href: '/guardian/analytics', icon: BarChart2, label: 'Analytics' },
    { href: '/guardian/profile', icon: User, label: 'Profile' },
    { href: '/guardian/settings', icon: Settings, label: 'Settings' },
  ];
  
  // Mobile nav shows 4 core items + a "More" button
  const mobileCoreNavItems = navItems.slice(0, 4);

  const handleSwitchRole = () => {
    if (window.confirm('Switch back to user profile?')) {
      setRole('user');
      router.push('/home');
    }
  };

  return (
    <RoleGuard allowedRoles={['guardian']}>
      <GuardianDataProvider>
        <div className="flex-1 flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-[--background]">
          
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex flex-col w-64 bg-card border-r border-[--border] shadow-lg shrink-0 z-20">
            <div className="p-6 border-b border-[--border]">
              <div className="flex items-center gap-3 text-primary">
                <Shield size={28} className="fill-primary/20" />
                <span className="font-bold text-xl tracking-tight text-foreground">Guardian</span>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                      isActive 
                        ? 'bg-primary text-primary-fg shadow-sm' 
                        : 'text-muted-fg hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[--border]">
              <button 
                onClick={handleSwitchRole}
                className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-muted-fg hover:bg-muted hover:text-foreground transition-colors font-medium"
              >
                <LogOut size={20} />
                Switch Role
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 relative overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0 z-10">
            {children}
          </main>

          {/* Mobile Bottom Nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-[--border] pb-[env(safe-area-inset-bottom)] z-40">
            <div className="flex justify-around items-center h-16">
              {mobileCoreNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                      isActive ? 'text-primary' : 'text-muted-fg'
                    }`}
                  >
                    <div className={`p-1 rounded-full ${isActive ? 'bg-primary/10' : ''}`}>
                      <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] font-bold">{item.label}</span>
                  </Link>
                );
              })}
              
              <button
                onClick={() => setShowMoreMenu(true)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  showMoreMenu ? 'text-primary' : 'text-muted-fg'
                }`}
              >
                <div className={`p-1 rounded-full ${showMoreMenu ? 'bg-primary/10' : ''}`}>
                  <Menu size={20} strokeWidth={showMoreMenu ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-bold">More</span>
              </button>
            </div>
          </nav>

          {/* Mobile More Menu Drawer */}
          {showMoreMenu && (
            <BottomSheet 
              onClose={() => setShowMoreMenu(false)}
              className="z-50"
            >
              <div className="p-4 space-y-4">
                <h2 className="text-lg font-bold text-foreground mb-2 px-2">Navigation</h2>
                <div className="grid grid-cols-2 gap-2">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMoreMenu(false)}
                        className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-card text-foreground border border-[--glass-border]'
                        }`}
                      >
                        <item.icon size={20} className={isActive ? 'text-primary' : 'text-muted-fg'} />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                
                <div className="pt-4 border-t border-[--border] mt-4">
                  <button 
                    onClick={() => {
                      setShowMoreMenu(false);
                      handleSwitchRole();
                    }}
                    className="flex items-center justify-center gap-2 p-3 w-full rounded-xl bg-muted text-foreground font-bold"
                  >
                    <LogOut size={20} />
                    Switch to Citizen
                  </button>
                </div>
              </div>
            </BottomSheet>
          )}

        </div>
      </GuardianDataProvider>
    </RoleGuard>
  );
}

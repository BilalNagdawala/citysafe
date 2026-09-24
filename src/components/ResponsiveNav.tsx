'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Map as MapIcon, User, Moon, Sun, Monitor, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

export default function ResponsiveNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const navItems = [
    { name: 'Home', href: '/', icon: Shield },
    { name: 'Explore', href: '/explore', icon: MapIcon },
    { name: 'Tools', href: '/safety-tools', icon: ShieldAlert },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const hideMobileNav = pathname.startsWith('/route') || pathname.startsWith('/active-journey');

  return (
    <>
      {/* Mobile Bottom Navigation */}
      {!hideMobileNav && (
        <div className="md:hidden fixed bottom-0 left-0 w-full z-[100] pb-[env(safe-area-inset-bottom)] pointer-events-none">
          <nav className="mx-4 mb-4 glass-pill rounded-full p-2 pointer-events-auto shadow-xl">
            <ul className="flex justify-around items-center relative">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <li key={item.name} className="flex-1 relative">
                    <Link 
                      href={item.href}
                      className={clsx(
                        "relative flex flex-col items-center justify-center gap-1 h-[56px] rounded-full z-10 transition-colors",
                        isActive ? "text-primary" : "text-muted-fg hover:text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                      <span className="text-[10px] font-medium tracking-wide">{item.name}</span>
                    </Link>
                    
                    {isActive && (
                      <motion.div 
                        layoutId="mobile-nav-active"
                        className="absolute inset-0 bg-primary/10 rounded-full z-0 border border-primary/10" 
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-[240px] h-[100dvh] bg-[--background] z-50 p-4 shrink-0 border-r border-[--border] relative">
        <div className="flex items-center gap-3 mb-8 pl-3 mt-4">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-primary-fg" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">CitySafe AI</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "relative z-10 flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium overflow-hidden group",
                  isActive ? "text-primary" : "text-muted-fg hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="desktop-nav-active"
                    className="absolute inset-0 bg-primary/10 rounded-xl z-[-1]" 
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                {!isActive && (
                  <div className="absolute inset-0 bg-muted/50 rounded-xl z-[-1] opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                <Icon className="w-5 h-5 relative z-10" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-sm font-semibold relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-4 pt-4">
          <div className="flex p-1 bg-muted/50 rounded-xl border border-[--border]">
            {!mounted ? (
              <>
                <button className="flex-1 py-1.5 rounded-lg flex justify-center transition-colors text-muted-fg"><Sun className="w-4 h-4" /></button>
                <button className="flex-1 py-1.5 rounded-lg flex justify-center transition-colors text-muted-fg"><Monitor className="w-4 h-4" /></button>
                <button className="flex-1 py-1.5 rounded-lg flex justify-center transition-colors text-muted-fg"><Moon className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setTheme('light')}
                  className={clsx("flex-1 py-1.5 rounded-lg flex justify-center transition-colors", theme === 'light' ? "bg-[--background] shadow-sm text-foreground" : "text-muted-fg hover:text-foreground")}
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTheme('system')}
                  className={clsx("flex-1 py-1.5 rounded-lg flex justify-center transition-colors", theme === 'system' ? "bg-[--background] shadow-sm text-foreground" : "text-muted-fg hover:text-foreground")}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={clsx("flex-1 py-1.5 rounded-lg flex justify-center transition-colors", theme === 'dark' ? "bg-[--background] shadow-sm text-foreground" : "text-muted-fg hover:text-foreground")}
                >
                  <Moon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          
          <div className="text-[11px] text-muted-fg font-medium pl-3 opacity-60">
            CitySafe AI v2.0.0
          </div>
        </div>
      </aside>
    </>
  );
}

'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { User, Shield, MapPin, Users, Moon, Sun, Monitor, AlertTriangle, X, Trash2, Navigation, Lock, ChevronLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useRole } from '@/providers/RoleProvider';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/RoleGuard';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-muted flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  )
});

export default function Profile() {
  const prefersReducedMotion = useReducedMotion();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [locationPerms, setLocationPerms] = useState(true);
  const [trustedContacts, setTrustedContacts] = useState(3);
  const [activeModal, setActiveModal] = useState<'contacts' | 'emergency' | 'journey' | 'privacy' | null>(null);
  
  const { role, setRole, signOut } = useRole();
  const router = useRouter();

  const [userName, setUserName] = useState('Sarah Jenkins');
  const [userEmail, setUserEmail] = useState('sarah.jenkins@example.com');

  useEffect(() => {
    setMounted(true);
    const savedDemo = localStorage.getItem('demo-location');
    if (savedDemo) setDemoMode(savedDemo === 'true');

    // Sync/fetch user profile with MongoDB
    const syncUser = async () => {
      try {
        const res = await fetch('/api/users?email=sarah.jenkins@example.com');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserName(data.user.name);
            setUserEmail(data.user.email);
          }
        } else {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Sarah Jenkins',
              email: 'sarah.jenkins@example.com',
              role: 'user',
            }),
          });
        }
      } catch (e) {
        console.error('Failed to sync user with MongoDB:', e);
      }
    };

    syncUser();
  }, []);

  const handleDemoModeChange = (val: boolean) => {
    setDemoMode(val);
    localStorage.setItem('demo-location', String(val));
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  if (!mounted) {
    return <main className="flex-1 w-full h-full bg-[--background]" />;
  }

  return (
    <RoleGuard allowedRoles={['user']}>
    <main className="flex-1 w-full h-[100dvh] relative overflow-hidden bg-[--background] flex flex-col md:flex-row">
      
      {/* Profile Panel */}
      <div className="z-20 w-full h-full bg-[--background] overflow-y-auto hide-scrollbar pb-[calc(80px+env(safe-area-inset-bottom))] md:relative md:w-[420px] md:shrink-0 md:bg-[--glass-bg] md:border-r md:border-[--glass-border] md:pb-6 flex flex-col">
        <header className="p-5 pt-[calc(20px+env(safe-area-inset-top))] sticky top-0 bg-[--background]/90 md:bg-transparent backdrop-blur-lg z-20 border-b border-[--glass-border] md:border-b-0 flex items-center gap-3">
          <div className="md:hidden">
            <Link href="/" className="p-2 rounded-full hover:bg-muted/50 transition-colors text-foreground block -ml-2">
              <ChevronLeft size={20} />
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile Settings</h1>
        </header>

        <div className="px-5 w-full flex flex-col pb-20 md:pb-0">
        
        {/* User Card */}
        <section className="flex flex-col items-center text-center mt-4 md:mt-8 mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-300 p-1 mb-4 shadow-lg">
            <div className="w-full h-full bg-[--background] rounded-full flex items-center justify-center border-2 border-transparent">
              <User size={40} className="text-muted-fg" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{userName}</h2>
          <p className="text-sm font-medium text-muted-fg mb-4">{userEmail}</p>
          <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full">
            Premium Member
          </span>
        </section>

        {/* Safety & Emergency */}
        <section className="mb-6">
          <SectionHeader title="Safety & Emergency" />
          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <SettingRow 
              icon={Users} 
              title="Trusted Contacts" 
              subtitle={`${trustedContacts} contacts configured`} 
              type="link"
              onClick={() => setActiveModal('contacts')}
            />
            <SettingRow 
              icon={AlertTriangle} 
              title="Emergency Preferences" 
              subtitle="Default actions when SOS is triggered" 
              type="link"
              onClick={() => setActiveModal('emergency')}
            />
            <SettingRow 
              icon={MapPin} 
              title="Location Services" 
              subtitle="Required for route safety scoring" 
              type="toggle"
              value={locationPerms}
              onChange={setLocationPerms}
            />
          </div>
        </section>

        {/* App Appearance & Preferences */}
        <section className="mb-6">
          <SectionHeader title="App Preferences" />
          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <SettingRow 
              icon={Navigation} 
              title="Journey Preferences" 
              subtitle="Route planning and navigation settings" 
              type="link"
              onClick={() => setActiveModal('journey')}
            />
            <SettingRow 
              icon={resolvedTheme === 'dark' ? Moon : Sun} 
              title="Appearance" 
              type="select"
              value={theme || 'system'}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'System', value: 'system' }
              ]}
              onChange={handleThemeChange}
            />
          </div>
        </section>

        {/* Privacy & Developer */}
        <section className="mb-6">
          <SectionHeader title="Privacy & Data" />
          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <SettingRow 
              icon={Lock} 
              title="Privacy" 
              subtitle="Manage your personal data" 
              type="link"
              onClick={() => setActiveModal('privacy')}
            />
            <SettingRow 
              icon={Monitor} 
              title="Demo Location Mode" 
              subtitle="Lock GPS to Andheri East for demonstration"
              type="toggle"
              value={demoMode}
              onChange={handleDemoModeChange}
            />
          </div>
        </section>

        {/* Account Actions */}
        <section className="mt-4 mb-10 flex flex-col items-center">
          <div className="w-full glass-panel rounded-2xl overflow-hidden shadow-sm flex flex-col">
             {role === 'user' && (
               <SettingRow 
                 icon={Shield} 
                 title="Switch to Guardian Workspace" 
                 type="button"
                 onClick={() => {
                   if (window.confirm('Switch to the Guardian Workspace?')) {
                     const hasGuardianProfile = localStorage.getItem('guardian-profile');
                     if (hasGuardianProfile) {
                       setRole('guardian');
                       router.push('/guardian');
                     } else {
                       router.push('/guardian/register');
                     }
                   }
                 }}
               />
             )}
             <SettingRow 
              icon={User} 
              title="Sign Out" 
              type="button"
              danger={true}
              onClick={() => {
                if (window.confirm('Are you sure you want to sign out?')) {
                  signOut();
                  router.push('/');
                }
              }}
            />
          </div>
          <span className="text-[10px] text-muted-fg mt-6 font-semibold uppercase tracking-widest">
            CitySafe AI v1.0.0
          </span>
        </section>

        </div>
      </div>

      {/* Map Background (Visible mostly on Desktop) */}
      <motion.div 
        className="hidden md:block absolute inset-0 md:relative md:flex-1 z-0 bg-slate-100 dark:bg-zinc-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <Map 
          routes={[]} 
          routeScores={[]} 
          selectedRouteIndex={null} 
          origin={undefined}
        />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[--background] to-transparent pointer-events-none z-10" />
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
      {activeModal === 'contacts' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0, y: 10 }}
            className="bg-[--background] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-[--glass-border]"
          >
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 text-muted-fg hover:bg-muted transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-6 text-foreground">Trusted Contacts</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center bg-muted/30 p-4 rounded-2xl border border-[--glass-border]">
                  <div>
                    <p className="font-bold text-foreground">Contact {i}</p>
                    <p className="text-xs text-muted-fg font-medium">+1 234 567 890</p>
                  </div>
                  <button className="text-danger p-2 bg-danger/10 rounded-full hover:bg-danger/20 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button className="w-full bg-primary/10 text-primary font-bold p-4 rounded-2xl mt-4 border border-primary/20 hover:bg-primary/20 transition-colors">
                + Add New Contact
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeModal === 'emergency' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0, y: 10 }}
            className="bg-[--background] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-[--glass-border]"
          >
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 text-muted-fg hover:bg-muted transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-6 text-foreground">Emergency Preferences</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-[--glass-border]">
                <span className="font-semibold text-sm text-foreground">Share Live Location</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </label>
              <label className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-[--glass-border]">
                <span className="font-semibold text-sm text-foreground">Auto-record Audio</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </label>
              <label className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-[--glass-border]">
                <span className="font-semibold text-sm text-foreground">Notify Contacts Immediately</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </label>
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeModal === 'journey' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0, y: 10 }}
            className="bg-[--background] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-[--glass-border]"
          >
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 text-muted-fg hover:bg-muted transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-6 text-foreground">Journey Preferences</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-[--glass-border]">
                <span className="font-semibold text-sm text-foreground">Prioritize Well-lit Routes</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </label>
              <label className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-[--glass-border]">
                <span className="font-semibold text-sm text-foreground">Avoid Empty Streets at Night</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </label>
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeModal === 'privacy' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0, y: 10 }}
            className="bg-[--background] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-[--glass-border]"
          >
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 text-muted-fg hover:bg-muted transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-6 text-foreground">Privacy</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-[--glass-border]">
                <span className="font-semibold text-sm text-foreground">Share Anonymized Data</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </label>
              <button className="w-full text-danger font-bold p-4 bg-danger/10 rounded-2xl mt-4 border border-danger/20 hover:bg-danger/20 transition-colors">
                Delete Account Data
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </main>
    </RoleGuard>
  );
}

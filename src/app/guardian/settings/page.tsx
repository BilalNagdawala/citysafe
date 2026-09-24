'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Settings, Bell, Lock, Shield, Map, EyeOff, LogOut } from 'lucide-react';
import { useRole } from '@/providers/RoleProvider';

export default function SettingsPage() {
  const { signOut } = useRole();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pt-[calc(16px+env(safe-area-inset-top))] pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Settings className="text-primary" /> Settings
          </h1>
          <p className="text-muted-fg font-medium mt-1">Configure your dashboard and operational preferences.</p>
        </div>
      </header>

      <div className="space-y-6">
        {/* Notifications */}
        <GlassCard className="!p-6 border border-[--glass-border]">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Bell size={20} className="text-primary" /> Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm">Critical Alerts</h3>
                <p className="text-xs text-muted-fg mt-0.5">Push notifications and loud sound for high priority incidents.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="h-px w-full bg-[--border]"></div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm">Background Location</h3>
                <p className="text-xs text-muted-fg mt-0.5">Allow dispatch to see your location even when app is minimized.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Security & Privacy */}
        <GlassCard className="!p-6 border border-[--glass-border]">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Shield size={20} className="text-primary" /> Security & Privacy
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Lock size={14} /> Biometric Authentication
                </h3>
                <p className="text-xs text-muted-fg mt-0.5">Require Face ID / Touch ID to open the Guardian App.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="h-px w-full bg-[--border]"></div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <EyeOff size={14} /> Incognito Mode
                </h3>
                <p className="text-xs text-muted-fg mt-0.5">Hide your exact identity from other guardians on the map.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Map Preferences */}
        <GlassCard className="!p-6 border border-[--glass-border]">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Map size={20} className="text-primary" /> Map Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Default Map Layer</label>
              <select className="w-full bg-card border border-[--border] text-foreground rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-primary shadow-sm font-medium text-sm">
                <option>Standard Street Map</option>
                <option>Dark Mode Tactical</option>
                <option>Satellite</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Account Actions */}
        <div className="pt-4 flex flex-col gap-3">
          <button 
            onClick={() => {
              signOut();
              window.location.href = '/';
            }}
            className="w-full bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

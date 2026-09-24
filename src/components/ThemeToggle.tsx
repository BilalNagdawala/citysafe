'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import clsx from 'clsx';

export default function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className={clsx("p-3 rounded-full bg-slate-200 dark:bg-white/10 opacity-50", className)}>
        <Sun className="w-5 h-5 invisible" />
      </button>
    );
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button 
      onClick={toggleTheme}
      className={clsx(
        "p-3 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors",
        className
      )}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Moon className="w-5 h-5 text-amber-100" /> : <Sun className="w-5 h-5 text-amber-600" />}
    </button>
  );
}

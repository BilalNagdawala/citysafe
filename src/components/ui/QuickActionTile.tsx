'use client';

import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface QuickActionTileProps {
  title: string;
  icon: LucideIcon;
  variant?: 'primary' | 'danger' | 'default';
  onClick?: () => void;
  className?: string;
}

export function QuickActionTile({ title, icon: Icon, variant = 'default', onClick, className }: QuickActionTileProps) {
  const baseClasses = "flex flex-col justify-center items-center gap-2 p-4 rounded-2xl transition-all active:scale-95";
  
  const variants = {
    default: "bg-card border border-[--glass-border] shadow-sm hover:shadow-md text-foreground",
    primary: "bg-primary text-primary-fg shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30",
    danger: "bg-danger text-white shadow-md shadow-danger/20 hover:shadow-lg hover:shadow-danger/30"
  };

  return (
    <button 
      onClick={onClick}
      className={clsx(baseClasses, variants[variant], className)}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span className="text-xs font-bold tracking-tight text-center leading-tight">
        {title}
      </span>
    </button>
  );
}

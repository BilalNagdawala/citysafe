import React from 'react';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';
import clsx from 'clsx';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <GlassCard className={clsx("flex flex-col items-center justify-center text-center p-8 border-dashed", className)}>
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-muted-fg" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold mb-2 text-foreground tracking-tight">{title}</h3>
      <p className="text-sm text-muted-fg max-w-[240px] mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </GlassCard>
  );
}

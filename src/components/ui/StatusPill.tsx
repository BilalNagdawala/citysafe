import React from 'react';
import clsx from 'clsx';

interface StatusPillProps {
  children: React.ReactNode;
  status: 'safe' | 'warning' | 'danger' | 'neutral';
  className?: string;
}

export function StatusPill({ children, status, className }: StatusPillProps) {
  const statusClasses = {
    safe: "bg-primary/15 text-primary border-primary/20",
    warning: "bg-warning/15 text-warning border-warning/20",
    danger: "bg-danger/15 text-danger border-danger/20",
    neutral: "bg-muted text-foreground border-[--glass-border]"
  };

  return (
    <div className={clsx(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border",
      statusClasses[status],
      className
    )}>
      {children}
    </div>
  );
}

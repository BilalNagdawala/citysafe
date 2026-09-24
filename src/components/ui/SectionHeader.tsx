import React from 'react';
import clsx from 'clsx';

export function SectionHeader({ title, action, className }: { title: string, action?: React.ReactNode, className?: string }) {
  return (
    <div className={clsx("flex justify-between items-center mb-4", className)}>
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-fg">{title}</h2>
      {action && <div className="text-sm font-semibold">{action}</div>}
    </div>
  );
}

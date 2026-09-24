'use client';

import { LucideIcon, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface SettingRowProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  type?: 'link' | 'toggle' | 'select' | 'button';
  value?: boolean | string;
  options?: { label: string; value: string }[];
  onChange?: (value: any) => void;
  onClick?: () => void;
  danger?: boolean;
}

export function SettingRow({
  icon: Icon,
  title,
  subtitle,
  type = 'link',
  value,
  options,
  onChange,
  onClick,
  danger = false
}: SettingRowProps) {
  const isToggle = type === 'toggle';
  const isSelect = type === 'select';
  
  const content = (
    <div className="flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors border-b border-[--glass-border] last:border-b-0 w-full text-left">
      <div className="flex items-center gap-3">
        <div className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          danger ? "bg-danger/10" : "bg-muted text-muted-fg group-hover:bg-primary/10 group-hover:text-primary"
        )}>
          <Icon size={16} className={danger ? "text-danger" : ""} />
        </div>
        <div className="flex flex-col">
          <span className={clsx("text-sm font-semibold", danger ? "text-danger" : "text-foreground")}>
            {title}
          </span>
          {subtitle && (
            <span className="text-xs text-muted-fg font-medium">{subtitle}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-end shrink-0 ml-4">
        {type === 'link' && <ChevronRight size={16} className="text-muted-fg" />}
        
        {isToggle && (
          <button 
            role="switch"
            aria-checked={value as boolean}
            onClick={(e) => { e.stopPropagation(); onChange?.(!value); }}
            className={clsx(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
              value ? "bg-primary" : "bg-muted-fg/30"
            )}
          >
            <span
              className={clsx(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                value ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        )}

        {isSelect && options && (
          <select 
            value={value as string}
            onChange={(e) => { e.stopPropagation(); onChange?.(e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium bg-muted text-foreground rounded-md px-2 py-1 outline-none border-none cursor-pointer"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  if (type === 'link' || type === 'button') {
    return (
      <button onClick={onClick} className="w-full block group text-left">
        {content}
      </button>
    );
  }

  return <div className="group">{content}</div>;
}

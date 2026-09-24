'use client';

import { LucideIcon } from 'lucide-react';

interface DiscoveryCardProps {
  title: string;
  subtitle: string;
  imageUrl?: string;
  icon?: LucideIcon;
  badge?: string;
  onClick?: () => void;
}

export function DiscoveryCard({ title, subtitle, imageUrl, icon: Icon, badge, onClick }: DiscoveryCardProps) {
  return (
    <button 
      onClick={onClick}
      className="relative flex-shrink-0 w-[240px] h-[160px] rounded-2xl overflow-hidden group text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Background */}
      {imageUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
      )}
      
      {/* Dark overlay for text readability if image exists */}
      {imageUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />}

      {/* Content */}
      <div className="absolute inset-0 p-4 flex flex-col justify-end z-10">
        {badge && (
          <div className="absolute top-4 left-4">
            <span className="glass-panel px-2 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider">
              {badge}
            </span>
          </div>
        )}
        
        {Icon && !imageUrl && (
          <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}

        <div>
          <h3 className={`text-base font-bold ${imageUrl ? 'text-white' : 'text-foreground'} leading-tight mb-1`}>
            {title}
          </h3>
          <p className={`text-xs ${imageUrl ? 'text-white/80' : 'text-muted-fg'} font-medium line-clamp-2`}>
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  );
}

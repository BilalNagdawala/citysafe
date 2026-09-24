import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export function LoadingSkeleton({ className, type = 'card' }: { className?: string, type?: 'text' | 'card' | 'circle' }) {
  const baseClasses = "bg-muted relative overflow-hidden";
  
  const typeClasses = {
    text: "h-4 rounded",
    card: "h-32 rounded-3xl",
    circle: "w-12 h-12 rounded-full"
  };

  return (
    <div className={clsx(baseClasses, typeClasses[type], className)}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[--glass-highlight] to-transparent"
        animate={{ translateX: ['-100%', '100%'] }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
}

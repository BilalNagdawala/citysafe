import React from 'react';
import clsx from 'clsx';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function GlassCard({ children, className, hoverEffect = false, ...props }: GlassCardProps) {
  return (
    <motion.div
      className={clsx(
        "glass-panel rounded-3xl p-5",
        hoverEffect && "transition-colors hover:bg-muted/30 cursor-pointer",
        className
      )}
      whileHover={hoverEffect ? { scale: 0.99 } : undefined}
      whileTap={hoverEffect ? { scale: 0.97 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

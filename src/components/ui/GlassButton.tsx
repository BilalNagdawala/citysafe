import React from 'react';
import clsx from 'clsx';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export function GlassButton({ children, className, variant = 'primary', ...props }: GlassButtonProps) {
  const baseClasses = "relative overflow-hidden font-bold tracking-wide rounded-2xl p-4 flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-foreground text-background shadow-md",
    secondary: "glass-panel text-foreground",
    danger: "bg-danger text-white shadow-md",
    ghost: "bg-transparent text-foreground hover:bg-muted/50"
  };

  return (
    <motion.button
      className={clsx(baseClasses, variantClasses[variant], className)}
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

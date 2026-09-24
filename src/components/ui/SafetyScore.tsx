import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface SafetyScoreProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function SafetyScore({ score, size = 60, strokeWidth = 6 }: SafetyScoreProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 75) return "stroke-primary";
    if (s >= 50) return "stroke-warning";
    return "stroke-danger";
  };

  const getTextColor = (s: number) => {
    if (s >= 75) return "text-primary";
    if (s >= 50) return "text-warning";
    return "text-danger";
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted"
        />
        {/* Foreground Animated Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          className={clsx("transition-colors", getColor(score))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx("font-black text-sm", getTextColor(score))}>{score}</span>
      </div>
    </div>
  );
}

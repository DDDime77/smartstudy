'use client';

import { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  style?: CSSProperties;
}

export default function GlassCard({
  children,
  className = '',
  hover = true,
  glow = false,
  style
}: GlassCardProps) {
  return (
    <div
      style={style}
      className={`
        glass-effect rounded-2xl p-6
        ${hover ? 'hover-glow transition-all duration-300 cursor-pointer' : ''}
        ${glow ? 'shadow-[0_0_15px_rgba(255,255,255,0.1)]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

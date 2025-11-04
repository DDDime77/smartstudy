'use client';

import { ReactNode } from 'react';

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  style?: React.CSSProperties;
}

export function BentoCard({ children, className = '', size = 'medium', style }: BentoCardProps) {
  const sizeClasses = {
    small: 'col-span-1 row-span-1',
    medium: 'col-span-1 md:col-span-1 row-span-1',
    large: 'col-span-1 md:col-span-2 row-span-1',
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-6
        glass-effect border border-white/10
        transition-all duration-500 ease-out
        hover:scale-[1.02] hover:border-white/30
        hover:shadow-[0_0_50px_rgba(255,255,255,0.1)]
        group
        ${sizeClasses[size]}
        ${className}
      `}
      style={style}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Animated glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
    </div>
  );
}

interface MagicBentoProps {
  children: ReactNode;
  className?: string;
}

export default function MagicBento({ children, className = '' }: MagicBentoProps) {
  return (
    <div
      className={`
        grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
        gap-6 auto-rows-fr
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Feature card specifically for the features section
interface FeatureBentoCardProps {
  icon: string;
  title: string;
  description: string;
  size?: 'small' | 'medium' | 'large';
  gradient?: string;
  delay?: number;
}

export function FeatureBentoCard({
  icon,
  title,
  description,
  size = 'medium',
  gradient = 'from-blue-500/10 to-purple-500/10',
  delay = 0,
}: FeatureBentoCardProps) {
  return (
    <BentoCard
      size={size}
      className="animate-slide-up"
      style={{ animationDelay: `${delay}ms` } as React.CSSProperties}
    >
      {/* Icon with animated background */}
      <div className="relative mb-6 inline-block">
        <div
          className={`
          absolute inset-0 bg-gradient-to-br ${gradient}
          rounded-2xl blur-xl opacity-50 group-hover:opacity-100
          transition-opacity duration-500
        `}
        />
        <div className="relative text-6xl transform group-hover:scale-110 transition-transform duration-500">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold mb-3 bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">
        {title}
      </h3>

      {/* Description */}
      <p className="text-white/70 leading-relaxed group-hover:text-white/90 transition-colors duration-300">
        {description}
      </p>

      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </BentoCard>
  );
}

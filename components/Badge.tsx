'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gradient' | 'glow';
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  const variants = {
    default: 'bg-white/10 border-white/20 text-white/90',
    gradient:
      'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-white/30 text-white',
    glow: 'bg-white/10 border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]',
  };

  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
        border backdrop-blur-sm
        transition-all duration-300
        hover:scale-105 hover:border-white/50
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

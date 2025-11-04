'use client';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  animate?: boolean;
}

export default function GradientText({
  children,
  className = '',
  gradient = 'from-blue-400 via-purple-400 to-pink-400',
  animate = true,
}: GradientTextProps) {
  return (
    <span
      className={`
        bg-gradient-to-r ${gradient}
        bg-clip-text text-transparent
        ${animate ? 'animate-gradient bg-[length:200%_auto]' : ''}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

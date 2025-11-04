'use client';

interface StepCardProps {
  step: string;
  title: string;
  description: string;
  delay?: number;
}

export default function StepCard({ step, title, description, delay = 0 }: StepCardProps) {
  return (
    <div
      className="flex gap-6 items-start animate-slide-up group"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Step indicator with glow */}
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative w-16 h-16 rounded-full glass-effect flex items-center justify-center text-2xl font-bold border-2 border-white/20 group-hover:border-white/40 transition-all duration-300 group-hover:scale-110">
          {step}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pt-2">
        <h3 className="text-2xl font-bold mb-2 group-hover:text-white transition-colors duration-300">
          {title}
        </h3>
        <p className="text-white/70 text-lg group-hover:text-white/90 transition-colors duration-300">
          {description}
        </p>

        {/* Decorative line */}
        <div className="mt-4 h-px bg-gradient-to-r from-white/20 to-transparent w-0 group-hover:w-full transition-all duration-700" />
      </div>
    </div>
  );
}

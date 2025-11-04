'use client';

import { useEffect, useState } from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  variant?: 'fade' | 'slide' | 'glitch' | 'typewriter';
}

export default function AnimatedText({
  text,
  className = '',
  delay = 0,
  variant = 'fade'
}: AnimatedTextProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);

      if (variant === 'typewriter') {
        let currentIndex = 0;
        const typewriterInterval = setInterval(() => {
          if (currentIndex <= text.length) {
            setDisplayedText(text.slice(0, currentIndex));
            currentIndex++;
          } else {
            clearInterval(typewriterInterval);
          }
        }, 50);

        return () => clearInterval(typewriterInterval);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay, variant]);

  const variantClasses = {
    fade: `transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`,
    slide: `transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`,
    glitch: `${isVisible ? 'animate-pulse' : 'opacity-0'}`,
    typewriter: 'opacity-100',
  };

  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {variant === 'typewriter' ? displayedText : text}
      {variant === 'typewriter' && displayedText.length < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}

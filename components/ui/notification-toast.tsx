'use client';

import { useEffect } from 'react';
import { X, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface NotificationToastProps {
  message: string;
  type?: 'success' | 'info' | 'error';
  isOpen: boolean;
  onClose: () => void;
  duration?: number; // Auto-close duration in milliseconds
}

export default function NotificationToast({
  message,
  type = 'info',
  isOpen,
  onClose,
  duration = 3000
}: NotificationToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/50 text-green-400',
    info: 'bg-blue-500/10 border-blue-500/50 text-blue-400',
    error: 'bg-destructive/10 border-destructive/50 text-destructive',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border
        backdrop-blur-md shadow-lg min-w-[300px] max-w-md
        ${colors[type]}
      `}>
        {icons[type]}
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-70 transition-opacity"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
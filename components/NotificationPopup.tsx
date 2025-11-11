'use client';

import React, { useEffect, useState } from 'react';
import { useNotifications } from './NotificationProvider';
import { X, Clock, BookOpen } from 'lucide-react';

export function NotificationPopup() {
  const { notifications, dismissNotification } = useNotifications();
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    const newNotifications = notifications.filter(n => !visible.includes(n.id));
    if (newNotifications.length > 0) {
      setVisible(prev => [...prev, ...newNotifications.map(n => n.id)]);
    }
  }, [notifications, visible]);

  const handleDismiss = (id: string) => {
    setVisible(prev => prev.filter(nId => nId !== id));
    setTimeout(() => {
      dismissNotification(id);
    }, 300);
  };

  const visibleNotifications = notifications.filter(n => visible.includes(n.id));

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white dark:bg-gray-800 border-l-4 border-blue-500 rounded-lg shadow-lg p-4 animate-slide-in-right"
          style={{
            animation: visible.includes(notification.id) ? 'slideInRight 0.3s ease-out' : 'slideOutRight 0.3s ease-in',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {notification.title}
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                {notification.message}
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">{notification.subject}</span>
                <span>📅 {notification.scheduledTime}</span>
              </div>
            </div>

            <button
              onClick={() => handleDismiss(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

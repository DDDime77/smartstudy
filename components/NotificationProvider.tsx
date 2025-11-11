'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationService, StudyNotification } from '@/lib/services/notifications';

interface NotificationContextType {
  notifications: StudyNotification[];
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<StudyNotification[]>([]);

  const checkNotifications = useCallback(async () => {
    try {
      const newNotifications = await NotificationService.checkForNotifications();

      if (newNotifications.length > 0) {
        setNotifications(prev => [...prev, ...newNotifications]);
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    checkNotifications();

    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, [checkNotifications]);

  return (
    <NotificationContext.Provider value={{ notifications, dismissNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

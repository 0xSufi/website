import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NotificationContextType {
  liveStreamNotificationsEnabled: boolean;
  setLiveStreamNotificationsEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [liveStreamNotificationsEnabled, setLiveStreamNotificationsEnabled] = useState<boolean>(() => {
    // Load from localStorage on init, default to true
    try {
      const stored = localStorage.getItem('noma_livestream_notification_enabled');
      return stored !== null ? JSON.parse(stored) : true;
    } catch (error) {
      console.error('[NotificationContext] Error loading from localStorage:', error);
      return true; // Default to enabled
    }
  });

  useEffect(() => {
    // Persist to localStorage whenever it changes
    try {
      localStorage.setItem('noma_livestream_notification_enabled', JSON.stringify(liveStreamNotificationsEnabled));
      // console.log('[NotificationContext] Saved preference:', liveStreamNotificationsEnabled);
    } catch (error) {
      console.error('[NotificationContext] Error saving to localStorage:', error);
    }
  }, [liveStreamNotificationsEnabled]);

  return (
    <NotificationContext.Provider value={{ liveStreamNotificationsEnabled, setLiveStreamNotificationsEnabled }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

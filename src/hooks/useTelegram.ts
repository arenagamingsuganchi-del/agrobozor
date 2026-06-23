'use client';

import { useEffect, useState } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
  };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  ready: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if window.Telegram.WebApp exists (standard script tag loading or SDK injection)
      const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })?.Telegram?.WebApp;
      if (tg) {
        Promise.resolve().then(() => {
          setWebApp(tg);
          setIsTelegram(true);
        });
        tg.ready();
        tg.expand();
      } else {
        // Fallback mockup for local desktop development
        console.warn('Telegram WebApp SDK is not found. Running in Guest/Development Mode.');
        Promise.resolve().then(() => {
          setWebApp({
            initData: 'auth_date=1620000000&query_id=AAH...&user=%7B%22id%22%3A123456%2C%22first_name%22%3A%22Mehmon%22%2C%22username%22%3A%22guest_user%22%7D&hash=dummydummy',
            initDataUnsafe: {
              query_id: 'AAH...',
              user: {
                id: 123456,
                first_name: 'Mehmon',
                username: 'guest_user',
              },
              auth_date: 1620000000,
              hash: 'dummydummy',
            },
            colorScheme: 'light',
            themeParams: {},
            isExpanded: true,
            viewportHeight: 600,
            viewportStableHeight: 600,
            headerColor: '#ffffff',
            backgroundColor: '#ffffff',
            expand: () => {},
            close: () => {},
            sendData: () => {},
            ready: () => {},
            MainButton: {
              text: '',
              color: '',
              textColor: '',
              isVisible: false,
              isActive: false,
              isProgressVisible: false,
              show: () => {},
              hide: () => {},
              enable: () => {},
              disable: () => {},
              showProgress: () => {},
              hideProgress: () => {},
              onClick: () => {},
              offClick: () => {},
            },
            BackButton: {
              isVisible: false,
              show: () => {},
              hide: () => {},
              onClick: () => {},
              offClick: () => {},
            },
            HapticFeedback: {
              impactOccurred: () => {},
              notificationOccurred: () => {},
              selectionChanged: () => {},
            },
          });
          setIsTelegram(false);
        });
      }
    }
  }, []);

  return {
    webApp,
    isTelegram,
    user: webApp?.initDataUnsafe?.user || null,
  };
}

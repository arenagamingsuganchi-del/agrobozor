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
    if (typeof window === 'undefined') {
      console.log("DEBUG [useTelegram] Window is undefined (SSR)");
      return;
    }

    let attempts = 0;
    const maxAttempts = 20; // 1 second total

    const checkTg = () => {
      const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })?.Telegram?.WebApp;
      if (tg) {
        console.log("DEBUG [useTelegram] SDK Found: window.Telegram.WebApp exists!", {
          initData: tg.initData ? tg.initData.substring(0, 30) + '...' : 'empty',
          user: tg.initDataUnsafe?.user
        });
        setWebApp(tg);
        setIsTelegram(true);
        tg.ready();
        tg.expand();
        return true;
      }
      return false;
    };

    console.log("DEBUG [useTelegram] useEffect mounted, starting initial checkTg");
    if (checkTg()) return;

    console.log("DEBUG [useTelegram] SDK not found initially, starting polling check Tg...");
    const interval = setInterval(() => {
      attempts++;
      console.log(`DEBUG [useTelegram] Polling check attempt ${attempts}/20`);
      if (checkTg() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts && !(window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })?.Telegram?.WebApp) {
          console.warn('DEBUG [useTelegram] SDK NOT found after 1s. Initializing mockup environment.');
          const mockWebApp = {
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
            colorScheme: 'light' as const,
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
          };
          setWebApp(mockWebApp);
          setIsTelegram(false);
        }
      }
    }, 50);

    return () => {
      console.log("DEBUG [useTelegram] Cleaning up polling interval");
      clearInterval(interval);
    };
  }, []);

  console.log("DEBUG [useTelegram] Hook return state:", {
    hasWebApp: !!webApp,
    isTelegram,
    user: webApp?.initDataUnsafe?.user
  });

  return {
    webApp,
    isTelegram,
    user: webApp?.initDataUnsafe?.user || null,
  };
}

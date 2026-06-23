'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { useTelegram } from '@/hooks/useTelegram';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const { user: tgUser, webApp } = useTelegram();
  const { setAuth, setLoading, user: storeUser, syncCart, loadCart } = useStore();

  useEffect(() => {
    async function handleTelegramLogin() {
      if (!webApp || !tgUser) return;

      setLoading(true);
      try {
        console.log('Attempting Telegram Login for user:', tgUser.id);
        
        // 1. Fetch user from Supabase
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', tgUser.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // User not found in DB, create new user (Buyer by default)
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              telegram_id: tgUser.id,
              username: tgUser.username || null,
              first_name: tgUser.first_name,
              phone: 'not-verified',
              role: 'buyer',
            })
            .select('*')
            .single();

          if (createError) {
            console.error('Failed to create user in database:', createError);
          } else if (newUser) {
            setAuth(newUser, 'local-session-token');
            // Sync guest cart into DB cart on sign up
            await syncCart(newUser.id);
          }
        } else if (dbUser) {
          setAuth(dbUser, 'local-session-token');
          // Sync guest cart into DB cart on login
          await syncCart(dbUser.id);
        }
      } catch (err) {
        console.error('Authentication error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (webApp && tgUser && !storeUser) {
      handleTelegramLogin();
    }
  }, [webApp, tgUser, storeUser, setAuth, setLoading, syncCart]);

  // Load guest cart items from localStorage on initial load if guest
  useEffect(() => {
    if (!storeUser) {
      loadCart(null);
    }
  }, [storeUser, loadCart]);

  // Sync user ID with Supabase client headers for RLS (Product Visibility Rules)
  useEffect(() => {
    if (storeUser) {
      (supabase as unknown as { rest: { headers: Record<string, string> } }).rest.headers['x-user-id'] = storeUser.id;
    } else {
      delete (supabase as unknown as { rest: { headers: Record<string, string> } }).rest.headers['x-user-id'];
    }
  }, [storeUser]);

  return (
    <>
      {/* Inject Telegram WebApp Script to ensure window.Telegram is populated */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}

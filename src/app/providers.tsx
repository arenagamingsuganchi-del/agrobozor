'use client';

import React, { useEffect } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const { user: tgUser, webApp, isTelegram } = useTelegram();
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

        if (error) {
          if (error.code === 'PGRST116') {
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
              setLoading(false);
            } else if (newUser) {
              setAuth(newUser, 'local-session-token');
              setLoading(false); // Unlock UI immediately
              syncCart(newUser.id).catch(console.error); // Sync cart in background
            } else {
              setLoading(false);
            }
          } else {
            console.error('Database error fetching user:', error.message);
            setLoading(false); // Unlock UI on database/connection errors
          }
        } else if (dbUser) {
          setAuth(dbUser, 'local-session-token');
          setLoading(false); // Unlock UI immediately
          syncCart(dbUser.id).catch(console.error); // Sync cart in background
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setLoading(false);
      }
    }

    if (webApp && tgUser && !storeUser) {
      handleTelegramLogin();
    }
  }, [webApp, tgUser, storeUser, setAuth, setLoading, syncCart]);

  // If not in Telegram, stop the loading state immediately so page renders
  useEffect(() => {
    if (webApp && !isTelegram) {
      setLoading(false);
    }
  }, [webApp, isTelegram, setLoading]);

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

  return <>{children}</>;
}

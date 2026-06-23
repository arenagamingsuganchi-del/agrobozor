'use client';

import React, { useEffect } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const { user: tgUser, webApp, isTelegram } = useTelegram();
  const { setAuth, setLoading, user: storeUser, syncCart, loadCart } = useStore();

  console.log("DEBUG [providers] Render state:", {
    hasTgUser: !!tgUser,
    hasWebApp: !!webApp,
    isTelegram,
    hasStoreUser: !!storeUser
  });

  useEffect(() => {
    async function handleTelegramLogin() {
      if (!webApp || !tgUser) {
        console.log("DEBUG [providers] handleTelegramLogin bypassed because webApp or tgUser is null", {
          hasWebApp: !!webApp,
          hasTgUser: !!tgUser
        });
        return;
      }

      console.log("DEBUG [providers] handleTelegramLogin triggered for telegram_id:", tgUser.id);
      setLoading(true);
      
      try {
        console.log("DEBUG [providers] Env check:", {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'placeholder-fallback-used',
          supabaseKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        });

        console.log("DEBUG [providers] Step 1: Querying users table for telegram_id:", tgUser.id);
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', tgUser.id)
          .single();

        console.log("DEBUG [providers] Step 2: Query result:", {
          hasData: !!dbUser,
          error: error ? { code: error.code, message: error.message } : null
        });

        if (error) {
          if (error.code === 'PGRST116') {
            console.log("DEBUG [providers] Step 3: User not found in DB (PGRST116). Creating profile...");
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

            console.log("DEBUG [providers] Step 3.1: Create result:", {
              hasNewUser: !!newUser,
              createError: createError ? { code: createError.code, message: createError.message } : null
            });

            if (createError) {
              console.error('DEBUG [providers] Failed to create user in database:', createError);
              setLoading(false);
            } else if (newUser) {
              console.log("DEBUG [providers] Step 3.2: Calling setAuth & background syncCart...");
              setAuth(newUser, 'local-session-token');
              setLoading(false);
              syncCart(newUser.id).catch((e) => console.error("DEBUG [providers] syncCart error:", e));
            } else {
              setLoading(false);
            }
          } else {
            console.error('DEBUG [providers] Database error fetching user:', error.message);
            setLoading(false);
          }
        } else if (dbUser) {
          console.log("DEBUG [providers] Step 4: User found. Calling setAuth & background syncCart...");
          setAuth(dbUser, 'local-session-token');
          setLoading(false);
          syncCart(dbUser.id).catch((e) => console.error("DEBUG [providers] syncCart error:", e));
        } else {
          console.log("DEBUG [providers] Step 4.F: No data and no error returned. Unlocking loading.");
          setLoading(false);
        }
      } catch (err) {
        console.error('DEBUG [providers] Authentication catch block error:', err);
        setLoading(false);
      }
    }

    if (webApp && tgUser && !storeUser) {
      handleTelegramLogin();
    }
  }, [webApp, tgUser, storeUser, setAuth, setLoading, syncCart]);

  // If not in Telegram, stop the loading state immediately so page renders
  useEffect(() => {
    console.log("DEBUG [providers] Non-Telegram layout check:", {
      hasWebApp: !!webApp,
      isTelegram
    });
    if (webApp && !isTelegram) {
      console.log("DEBUG [providers] Outside Telegram, calling setLoading(false) immediately.");
      setLoading(false);
    }
  }, [webApp, isTelegram, setLoading]);

  // Load guest cart items from localStorage on initial load if guest
  useEffect(() => {
    if (!storeUser) {
      console.log("DEBUG [providers] Loading guest cart from localStorage");
      loadCart(null);
    }
  }, [storeUser, loadCart]);

  // Sync user ID with Supabase client headers for RLS (Product Visibility Rules)
  useEffect(() => {
    if (storeUser) {
      console.log("DEBUG [providers] Syncing client header x-user-id:", storeUser.id);
      (supabase as unknown as { rest: { headers: Record<string, string> } }).rest.headers['x-user-id'] = storeUser.id;
    } else {
      console.log("DEBUG [providers] Deleting client header x-user-id");
      delete (supabase as unknown as { rest: { headers: Record<string, string> } }).rest.headers['x-user-id'];
    }
  }, [storeUser]);

  return <>{children}</>;
}

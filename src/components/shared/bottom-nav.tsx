/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, User, MessageSquare } from 'lucide-react';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';

export function BottomNav() {
  const pathname = usePathname();
  const { user: storeUser, cartItems } = useStore();
  const [unreadCount, setUnreadCount] = useState(0);

  const cartBadge = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    if (!storeUser) {
      setUnreadCount(0);
      return;
    }

    const currentUserId = storeUser.id;

    async function getUnreadCount() {
      try {
        const { data: participants, error: partError } = await supabase
          .from('chat_participants')
          .select('chat_id, last_read_at')
          .eq('user_id', currentUserId);

        if (partError || !participants) return;

        // Run counts in parallel using Promise.all to avoid N+1 database bottlenecks
        const countPromises = participants.map(async (p) => {
          const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', p.chat_id)
            .eq('is_deleted', false)
            .gt('created_at', p.last_read_at)
            .neq('sender_id', currentUserId);
          return countError ? 0 : (count || 0);
        });

        const counts = await Promise.all(countPromises);
        const totalUnread = counts.reduce((acc, c) => acc + c, 0);

        setUnreadCount(totalUnread);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    }

    getUnreadCount();

    const channel = supabase
      .channel('global_unread_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          getUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeUser]);

  const navItems = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'Savat', href: '/cart', icon: ShoppingCart, badge: cartBadge },
    { label: 'Chatlar', href: '/chats', icon: MessageSquare, badge: unreadCount },
    { label: 'Profil', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border-t border-slate-700/50 flex items-center justify-around px-4 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center space-y-1 w-16 h-full transition duration-150 relative ${
              isActive 
                ? 'text-emerald-400 scale-105' 
                : 'text-slate-400 hover:text-slate-350'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-slate-900 text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

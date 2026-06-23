/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/store';
import { MessageSquare, Calendar, Store, User, ArrowRight, ClipboardList } from 'lucide-react';
import Link from 'next/link';

interface ChatItem {
  id: string;
  productId: string | null;
  productTitle: string | null;
  orderId: string | null;
  orderNumber: string | null;
  lastMessageAt: string | null;
  lastMessageContent: string | null;
  lastMessageSenderId: string | null;
  lastMessageDeleted: boolean;
  otherParticipantName: string;
  isStore: boolean;
  unreadCount: number;
}

interface ChatResponse {
  id: string;
  product_id: string | null;
  order_id: string | null;
  last_message_at: string | null;
  last_message_id: string | null;
  created_at: string;
  products: { title: string } | null;
  orders: { order_number: string } | null;
}

interface ParticipationResponse {
  chat_id: string;
  last_read_at: string;
  chats: ChatResponse | null;
}

interface SellerResponse {
  store_name: string;
}

interface UserResponse {
  first_name: string | null;
  sellers: SellerResponse[] | SellerResponse | null;
}

interface OtherParticipantResponse {
  chat_id: string;
  user_id: string;
  users: UserResponse | null;
}

interface MessageResponse {
  id: string;
  chat_id: string;
  content: string;
  sender_id: string | null;
  is_deleted: boolean;
  created_at: string;
}

export default function ChatsListPage() {
  const { user: storeUser } = useStore();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadChatsList() {
    if (!storeUser) return;
    try {
      setLoading(true);

      // 1. Fetch user's participations
      const { data: participationsData, error: partError } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          last_read_at,
          chats (
            id,
            product_id,
            order_id,
            last_message_at,
            last_message_id,
            created_at,
            products (title),
            orders (order_number)
          )
        `)
        .eq('user_id', storeUser.id);

      if (partError || !participationsData) throw partError || new Error('No chats');

      const participations = participationsData as unknown as ParticipationResponse[];

      const chatIds = participations.map((p) => p.chat_id);
      if (chatIds.length === 0) {
        setChats([]);
        return;
      }

      // 2. Fetch other participants for these chats
      const { data: othersData, error: othersError } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          user_id,
          users (
            first_name,
            sellers (
              store_name
            )
          )
        `)
        .in('chat_id', chatIds)
        .neq('user_id', storeUser.id);

      if (othersError) throw othersError;

      const others = othersData as unknown as OtherParticipantResponse[];

      // 3. Fetch last messages in bulk
      const lastMsgIds = participations
        .map((p) => p.chats?.last_message_id)
        .filter(Boolean) as string[];

      let lastMessages: MessageResponse[] = [];
      if (lastMsgIds.length > 0) {
        const { data: msgs, error: msgError } = await supabase
          .from('messages')
          .select('id, chat_id, content, sender_id, is_deleted, created_at')
          .in('id', lastMsgIds);
        if (!msgError && msgs) {
          lastMessages = msgs as unknown as MessageResponse[];
        }
      }

      // 4. Calculate unread count for each chat in parallel
      const combinedChats: ChatItem[] = [];

      for (const part of participations) {
        const chatData = part.chats;
        if (!chatData) continue;

        // Find other participant user details
        const otherPart = others?.find((o) => o.chat_id === chatData.id);
        let name = 'Agro Foydalanuvchi';
        let isStore = false;

        if (otherPart && otherPart.users) {
          const u = otherPart.users;
          if (u.sellers) {
            if (Array.isArray(u.sellers)) {
              if (u.sellers.length > 0) {
                name = u.sellers[0].store_name;
                isStore = true;
              }
            } else {
              name = u.sellers.store_name || u.first_name || 'Ismsiz';
              isStore = !!u.sellers.store_name;
            }
          } else {
            name = u.first_name || 'Ismsiz';
          }
        }

        // Find last message details
        const lastMsg = lastMessages.find((m) => m.chat_id === chatData.id);
        const lastContent = lastMsg ? lastMsg.content : null;
        const lastSender = lastMsg ? lastMsg.sender_id : null;
        const lastDeleted = lastMsg ? lastMsg.is_deleted : false;
        const lastTime = chatData.last_message_at || chatData.created_at;

        // Fetch unread count for this specific chat
        const { count: unreadCount, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chatData.id)
          .eq('is_deleted', false)
          .gt('created_at', part.last_read_at)
          .neq('sender_id', storeUser.id);

        combinedChats.push({
          id: chatData.id,
          productId: chatData.product_id,
          productTitle: chatData.products?.title || null,
          orderId: chatData.order_id,
          orderNumber: chatData.orders?.order_number || null,
          lastMessageAt: lastTime,
          lastMessageContent: lastContent,
          lastMessageSenderId: lastSender,
          lastMessageDeleted: lastDeleted,
          otherParticipantName: name,
          isStore: isStore,
          unreadCount: (countError ? 0 : unreadCount) || 0,
        });
      }

      // Sort chats by lastMessageAt DESC (CTO Decision: Chat Health Monitoring)
      combinedChats.sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });

      setChats(combinedChats);
    } catch (err) {
      console.error('Failed to load chats list:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChatsList();

    // Subscribe to messages table changes to update list in real-time
    const channel = supabase
      .channel('chat_list_updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to inserts and soft-deletes/updates
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadChatsList();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeUser]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-20 bg-slate-800 rounded-2xl"></div>
        <div className="h-20 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 w-full text-xs">
      {/* Header */}
      <div className="flex flex-col space-y-0.5">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
          <MessageSquare className="w-4.5 h-4.5 text-emerald-450" />
          Suhbatlar
        </h2>
        <p className="text-[10px] text-slate-400">Buyer va Seller platforma ichidagi yozishmalar</p>
      </div>

      {chats.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-slate-850/20 border border-dashed border-slate-700/30 rounded-2xl p-6">
          <MessageSquare className="w-12 h-12 text-slate-650 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">Suhbatlar topilmadi</h3>
            <p className="text-[11px] text-slate-455 max-w-xs mx-auto leading-relaxed">
              Hozirda faol suhbatlar mavjud emas. Mahsulot tafsilotlari yoki buyurtmalar bo&apos;limidan sotuvchilar bilan bog&apos;lanishingiz mumkin.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/chats/${chat.id}`}
              className="block bg-slate-850/50 border border-slate-700/40 rounded-2xl p-3.5 hover:border-slate-600 transition shadow-sm"
            >
              <div className="flex justify-between items-start gap-3">
                {/* Profile Circle */}
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center shrink-0 text-slate-350">
                  {chat.isStore ? (
                    <Store className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <User className="w-5 h-5 text-emerald-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xs font-bold text-slate-200 truncate pr-2">
                      {chat.otherParticipantName}
                    </h3>
                    {chat.lastMessageAt && (
                      <span className="text-[8px] text-slate-500 font-medium shrink-0 flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(chat.lastMessageAt)}
                      </span>
                    )}
                  </div>

                  {/* Context helper */}
                  {(chat.productTitle || chat.orderNumber) && (
                    <div className="text-[8.5px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                      {chat.orderNumber ? (
                        <>
                          <ClipboardList className="w-3 h-3 text-emerald-500" />
                          <span>Buyurtma: {chat.orderNumber}</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3 h-3 text-emerald-500" />
                          <span className="truncate">Mahsulot: {chat.productTitle}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Message content */}
                  <p className={`text-[10.5px] truncate ${chat.lastMessageDeleted ? 'text-slate-500 italic' : 'text-slate-350 font-medium'}`}>
                    {chat.lastMessageDeleted ? (
                      'Xabar o&apos;chirilgan'
                    ) : chat.lastMessageContent ? (
                      chat.lastMessageSenderId === storeUser?.id ? (
                        `Siz: ${chat.lastMessageContent}`
                      ) : (
                        chat.lastMessageContent
                      )
                    ) : (
                      'Suhbat boshlandi...'
                    )}
                  </p>
                </div>

                {/* Arrow / Badges */}
                <div className="flex flex-col justify-between items-end h-10 shrink-0">
                  {chat.unreadCount > 0 ? (
                    <span className="bg-emerald-500 text-slate-900 text-[9px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                      {chat.unreadCount}
                    </span>
                  ) : (
                    <div className="h-4.5"></div>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-slate-650" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/store';
import { ChevronLeft, Send, Trash2, ShieldAlert, Store, User, FileText } from 'lucide-react';
import Image from 'next/image';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string | null; // null represents System Message
  content: string;
  is_deleted: boolean;
  created_at: string;
}

interface ChatMetadata {
  id: string;
  product_id: string | null;
  order_id: string | null;
  products: {
    title: string;
    price: number;
    unit: string;
    product_images: { image_url: string; is_primary: boolean }[];
  } | null;
  orders: {
    order_number: string;
    status: string;
  } | null;
}

interface SellerResponse {
  store_name: string;
}

interface UserResponse {
  first_name: string | null;
  sellers: SellerResponse[] | SellerResponse | null;
}

interface ParticipantResponse {
  user_id: string;
  users: UserResponse | null;
}

export default function ChatWindowPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id as string;
  const { user: storeUser } = useStore();

  const [chat, setChat] = useState<ChatMetadata | null>(null);
  const [otherName, setOtherName] = useState('Agro Foydalanuvchi');
  const [isStore, setIsStore] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Message Form state
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadChatDetails() {
    if (!storeUser || !chatId) return;
    try {
      setLoading(true);

      // 1. Fetch chat metadata
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select(`
          id,
          product_id,
          order_id,
          products (
            title,
            price,
            unit,
            product_images (
              image_url,
              is_primary
            )
          ),
          orders (
            order_number,
            status
          )
        `)
        .eq('id', chatId)
        .single();

      if (chatError || !chatData) {
        // Ownership security block (If user is not a participant, RLS will fail and return error/null)
        console.error('Access denied or chat not found:', chatError?.message);
        router.replace('/chats');
        return;
      }

      setChat(chatData as unknown as ChatMetadata);

      // 2. Fetch other participant user details
      const { data: participantsData, error: partError } = await supabase
        .from('chat_participants')
        .select(`
          user_id,
          users (
            first_name,
            sellers (
              store_name
            )
          )
        `)
        .eq('chat_id', chatId)
        .neq('user_id', storeUser.id);

      if (!partError && participantsData && participantsData.length > 0) {
        const participants = participantsData as unknown as ParticipantResponse[];
        const u = participants[0].users;
        if (u) {
          if (u.sellers) {
            if (Array.isArray(u.sellers)) {
              if (u.sellers.length > 0) {
                setOtherName(u.sellers[0].store_name);
                setIsStore(true);
              }
            } else {
              setOtherName(u.sellers.store_name || u.first_name || 'Ismsiz');
              setIsStore(!!u.sellers.store_name);
            }
          } else {
            setOtherName(u.first_name || 'Ismsiz');
            setIsStore(false);
          }
        }
      }

      // 3. Fetch message history
      const { data: msgHistory, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (msgHistory && !msgError) {
        setMessages(msgHistory);
      }

      // 4. Update last_read_at for this participant (CTO Decision: Unread Counter)
      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', storeUser.id);

    } catch (err) {
      console.error('Error loading chat:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChatDetails();

    // 5. Subscribe to message inserts & updates in real-time (CTO Decision: Supabase Realtime)
    const channel = supabase
      .channel(`chat_messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT (new msg) and UPDATE (deleted msg)
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              // Deduplicate in case loadChatDetails triggered at same time
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Mark as read automatically since chat is active
            if (storeUser) {
              await supabase
                .from('chat_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('chat_id', chatId)
                .eq('user_id', storeUser.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, storeUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !storeUser || sending) return;

    // Validate 2000 character limit (CTO Decision 5)
    if (input.length > 2000) {
      alert("Xabar uzunligi maksimal 2000 belgi bo'lishi mumkin.");
      return;
    }

    try {
      setSending(true);
      setRateLimitError(null);

      // Perform insert
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: storeUser.id,
          content: input.trim(),
        });

      if (insertError) {
        // Capture message rate limit database trigger exception (CTO Decision 3: Message Rate Limit)
        if (insertError.message.includes('limiti oshib ketdi')) {
          setRateLimitError("Xabarlar yuborish limiti oshib ketdi (Maksimal 10 ta xabar / 10 soniya). Iltimos, bir oz kuting.");
        } else {
          alert('Xabar yuborib bo\'lmadi: ' + insertError.message);
        }
      } else {
        setInput('');
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleSoftDeleteMessage = async (msgId: string) => {
    if (!confirm("Haqiqatdan ham ushbu xabarni o'chirmoqchimisiz?")) return;
    try {
      // Perform soft delete (CTO Decision 4)
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', msgId)
        .eq('sender_id', storeUser?.id); // Double check sender on client

      if (error) {
        alert('O\'chirishda xatolik: ' + error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  const getOrderBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'confirmed': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-14 bg-slate-800 rounded-2xl"></div>
        <div className="h-60 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  // Find product cover
  const productCover = chat?.products?.product_images?.find((img) => img.is_primary)?.image_url || 
    chat?.products?.product_images?.[0]?.image_url || 
    'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=150';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col w-full text-xs relative pb-16">
      
      {/* Sticky Header Row */}
      <header className="bg-slate-850 border-b border-slate-700/50 sticky top-0 z-40 p-3 shadow-md flex flex-col space-y-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/chats')}
            className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-450 hover:text-slate-205 transition duration-150"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/30 flex items-center justify-center text-emerald-450">
              {isStore ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <h1 className="text-xs font-bold text-slate-205">{otherName}</h1>
          </div>
        </div>

        {/* Product Context Header (CTO Decision 2: Product Context) */}
        {chat?.products && (
          <div className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-2 flex items-center gap-2.5 shadow-inner">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700/30">
              <Image 
                src={productCover} 
                alt={chat.products.title} 
                width={32} 
                height={32} 
                className="w-full h-full object-cover" 
                unoptimized 
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-slate-200 block truncate text-[10px]">{chat.products.title}</span>
              <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">
                {formatPrice(chat.products.price)} <span className="text-slate-500 font-normal">so&apos;m / {chat.products.unit}</span>
              </span>
            </div>
          </div>
        )}

        {/* Order Context Header (CTO Decision 3: Order Context) */}
        {chat?.orders && (
          <div className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-2 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buyurtma: {chat.orders.order_number}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold border capitalize ${getOrderBadgeStyle(chat.orders.status)}`}>
              {chat.orders.status === 'pending' ? 'Kutilmoqda' : chat.orders.status}
            </span>
          </div>
        )}
      </header>

      {/* Messages Stream Container */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col justify-end">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-slate-500 italic">
            Xabarlar yo&apos;q. Suhbatni boshlang.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === storeUser?.id;
            const isSystem = msg.sender_id === null;

            if (isSystem) {
              return (
                <div key={msg.id} className="mx-auto bg-slate-800/30 border border-slate-750/30 text-slate-400 text-[9px] px-3.5 py-1.5 rounded-xl font-bold uppercase tracking-wider text-center max-w-xs shadow-sm">
                  {msg.content}
                </div>
              );
            }

            return (
              <div 
                key={msg.id} 
                className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] rounded-2xl p-3 space-y-1 relative shadow-sm transition duration-150 ${
                  isMe 
                    ? 'bg-emerald-500 text-slate-900 rounded-tr-none' 
                    : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-750/50'
                }`}>
                  {/* Delete Option for sender (CTO Decision 4: Soft Delete) */}
                  {isMe && !msg.is_deleted && (
                    <button
                      onClick={() => handleSoftDeleteMessage(msg.id)}
                      className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300 p-1 animate-in fade-in"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Message body */}
                  <p className={`text-[10.5px] leading-relaxed break-words whitespace-pre-wrap ${
                    msg.is_deleted ? (isMe ? 'text-slate-700 italic' : 'text-slate-500 italic') : ''
                  }`}>
                    {msg.is_deleted ? 'Xabar o&apos;chirilgan' : msg.content}
                  </p>

                  {/* Timestamp */}
                  <span className={`text-[7.5px] block text-right font-medium mt-0.5 ${
                    isMe ? 'text-slate-700' : 'text-slate-550'
                  }`}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Sticky Bottom Form Input Area */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-850 border-t border-slate-700/50 p-2.5 shadow-lg flex flex-col space-y-2">
        {rateLimitError && (
          <div className="bg-red-950/20 border border-red-900/30 text-red-400 p-2 rounded-xl text-[10px] flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>{rateLimitError}</span>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setRateLimitError(null);
              }}
              placeholder="Xabar yozing..."
              className={`w-full px-3.5 py-2.5 pr-14 bg-slate-900 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition resize-none ${
                input.length > 2000 ? 'border-red-500' : 'border-slate-700 focus:border-emerald-500/80'
              }`}
            />
            {/* Character limit counter (CTO Decision 5) */}
            <span className={`absolute right-2.5 bottom-2.5 text-[8px] font-bold ${
              input.length > 2000 ? 'text-red-400' : 'text-slate-550'
            }`}>
              {input.length}/2000
            </span>
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || input.length > 2000 || sending}
            className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 rounded-xl flex items-center justify-center transition active:scale-95 shrink-0 shadow-md shadow-emerald-500/5"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}

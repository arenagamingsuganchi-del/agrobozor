'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { ShoppingBag, ChevronLeft, MapPin, Phone, Calendar, Store, XCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { logAnalyticsEvent } from '@/lib/analytics';

interface OrderItemSnapshot {
  id: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  delivery_address: string;
  contact_phone: string;
  created_at: string;
  sellers: { id: string; user_id: string; store_name: string } | null;
  order_items: OrderItemSnapshot[];
}

export default function BuyerOrdersPage() {
  const { user: storeUser } = useStore();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadBuyerOrders() {
      if (!storeUser) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            status,
            total_price,
            delivery_address,
            contact_phone,
            created_at,
            sellers (
              id,
              user_id,
              store_name
            ),
            order_items (
              id,
              product_name,
              product_price,
              product_image,
              quantity
            )
          `)
          .eq('buyer_id', storeUser.id)
          .order('created_at', { ascending: false });

        if (data && !error) {
          setOrders(data as unknown as Order[]);
        } else if (error) {
          console.error('Failed to load buyer orders:', error.message);
        }
      } catch (err) {
        console.error('Error loading buyer orders:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBuyerOrders();
  }, [storeUser]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Haqiqatdan ham ushbu buyurtmani bekor qilmoqchimisiz?')) return;
    try {
      setActionLoading(orderId);
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        alert('Xatolik: ' + error.message);
      } else {
        setOrders(orders.map((o) => o.id === orderId ? { ...o, status: 'cancelled' } : o));
        logAnalyticsEvent('order_status_updated', { order_id: orderId, status: 'cancelled', updated_by: 'buyer' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi.';
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartChatFromOrder = async (order: Order) => {
    if (!storeUser || !order.sellers) return;

    try {
      setChatLoading(order.id);

      // Check if chat already exists for this order
      const { data: existingChats, error: queryError } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats!inner (
            id,
            order_id
          )
        `)
        .eq('user_id', storeUser.id)
        .eq('chats.order_id', order.id);

      if (queryError) throw queryError;

      let targetChatId: string | null = null;

      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(ec => ec.chat_id);
        const { data: sellerParticipants, error: sellerPartError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .in('chat_id', chatIds)
          .eq('user_id', order.sellers.user_id);

        if (sellerPartError) throw sellerPartError;

        if (sellerParticipants && sellerParticipants.length > 0) {
          targetChatId = sellerParticipants[0].chat_id;
        }
      }

      if (targetChatId) {
        router.push(`/chats/${targetChatId}`);
        return;
      }

      // Create new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          order_id: order.id,
        })
        .select('id')
        .single();

      if (chatError || !newChat) throw chatError;

      targetChatId = newChat.id;

      // Add participants
      const participantsPayload = [
        { chat_id: targetChatId, user_id: storeUser.id },
        { chat_id: targetChatId, user_id: order.sellers.user_id }
      ];

      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(participantsPayload);

      if (partError) throw partError;

      // First System Message (CTO Decision 2)
      const systemMessageContent = `${order.order_number} buyurtmasi bo'yicha suhbat boshlandi.`;
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          chat_id: targetChatId,
          sender_id: null,
          content: systemMessageContent,
        });

      if (msgError) console.error('Failed to create system message:', msgError.message);

      router.push(`/chats/${targetChatId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Suhbatni boshlashda xatolik yuz berdi.';
      alert(msg);
    } finally {
      setChatLoading(null);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'confirmed':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-550/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Kutilmoqda';
      case 'confirmed': return 'Tasdiqlandi';
      case 'completed': return 'Yetkazildi';
      case 'cancelled': return 'Bekor qilindi';
      default: return status;
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-40 bg-slate-800 rounded-2xl"></div>
        <div className="h-40 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 w-full text-xs">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/profile" 
          className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition duration-150"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-base font-bold text-slate-200">Buyurtmalarim</h1>
          <p className="text-[10px] text-slate-400">Xaridlar tarixi va statuslar</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', name: 'Barchasi' },
          { id: 'pending', name: 'Kutilmoqda' },
          { id: 'confirmed', name: 'Tasdiqlandi' },
          { id: 'completed', name: 'Yetkazildi' },
          { id: 'cancelled', name: 'Bekor qilingan' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-full border text-[10px] font-semibold whitespace-nowrap transition duration-150 ${
              statusFilter === tab.id
                ? 'bg-emerald-500 text-slate-900 border-emerald-450'
                : 'bg-slate-800 text-slate-400 border-slate-700/40 hover:text-slate-350'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center space-y-4 bg-slate-850/20 border border-dashed border-slate-700/30 rounded-2xl p-6">
          <ShoppingBag className="w-10 h-10 text-slate-650 mx-auto" />
          <div className="space-y-1">
            <p className="text-slate-450">Hech qanday buyurtma topilmadi.</p>
          </div>
          <Link
            href="/home"
            className="inline-flex px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 rounded-xl font-semibold transition"
          >
            Do&apos;konga o&apos;tish
          </Link>
        </div>
      ) : (
        /* Orders list */
        <div className="space-y-4">
          {filteredOrders.map((ord) => (
            <div 
              key={ord.id}
              className="bg-slate-800/45 border border-slate-700/45 rounded-2xl p-4 space-y-3.5 shadow-md"
            >
              {/* Order Meta Header */}
              <div className="flex justify-between items-start border-b border-slate-750/30 pb-2.5">
                <div>
                  <span className="font-bold text-emerald-400 text-xs block">{ord.order_number}</span>
                  <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(ord.created_at)}
                  </span>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(ord.status)}`}>
                  {getStatusText(ord.status)}
                </span>
              </div>

              {/* Seller store */}
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[10px]">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>{ord.sellers?.store_name || 'Agro Seller'}</span>
              </div>

              {/* Items List (Snapshots) */}
              <div className="divide-y divide-slate-700/25">
                {ord.order_items.map((item) => (
                  <div key={item.id} className="py-2 flex items-center gap-2.5 first:pt-0 last:pb-0">
                    <div className="relative w-9 h-9 bg-slate-900 border border-slate-700/30 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={item.product_image || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=150'}
                        alt={item.product_name}
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-slate-200 block truncate">{item.product_name}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5 block">
                        {item.quantity} dona x {formatPrice(item.product_price)} so&apos;m
                      </span>
                    </div>
                    <span className="font-bold text-slate-300 shrink-0">
                      {formatPrice(item.product_price * item.quantity)} so&apos;m
                    </span>
                  </div>
                ))}
              </div>

              {/* Address details */}
              <div className="bg-slate-900/30 border border-slate-705/30 rounded-xl p-2.5 space-y-1.5 text-[10px] text-slate-400">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-550 shrink-0 mt-0.5" />
                  <span>{ord.delivery_address}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-550 shrink-0" />
                  <span>{ord.contact_phone}</span>
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-750/30">
                <div className="text-xs">
                  <span className="text-slate-500 font-medium">Jami to&apos;lov:</span>
                  <span className="font-bold text-emerald-450 block text-sm mt-0.5">{formatPrice(ord.total_price)} so&apos;m</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartChatFromOrder(ord)}
                    disabled={chatLoading === ord.id}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 rounded-xl font-bold border border-slate-700/50 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    {chatLoading === ord.id ? '...' : 'Chat'}
                  </button>

                  {ord.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(ord.id)}
                      disabled={actionLoading === ord.id}
                      className="px-3.5 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-xl font-bold border border-red-900/30 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      Bekor qilish
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

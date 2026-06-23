'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { ShoppingBag, ChevronLeft, MapPin, Phone, Calendar, User, ShieldAlert, Check, XCircle, MessageSquare } from 'lucide-react';
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
  buyer: { id: string; first_name: string; username: string | null } | null;
  order_items: OrderItemSnapshot[];
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const { user: storeUser } = useStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSellerOrders() {
      if (!storeUser) return;
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch seller profile
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('id')
          .eq('user_id', storeUser.id)
          .single();

        if (sellerError || !sellerData) {
          router.replace('/profile');
          return;
        }

        // 2. Fetch incoming orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            status,
            total_price,
            delivery_address,
            contact_phone,
            created_at,
            buyer: users (
              id,
              first_name,
              username
            ),
            order_items (
              id,
              product_name,
              product_price,
              product_image,
              quantity
            )
          `)
          .eq('seller_id', sellerData.id)
          .order('created_at', { ascending: false });

        if (ordersData && !ordersError) {
          setOrders(ordersData as unknown as Order[]);
        } else if (ordersError) {
          throw ordersError;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Buyurtmalarni yuklashda xatolik.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadSellerOrders();
  }, [storeUser, router]);

  const handleUpdateStatus = async (orderId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      setActionLoading(orderId);
      setError(null);

      // Perform update (DB trigger will enforce pending -> confirmed/cancelled, confirmed -> completed)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        throw updateError;
      }

      setOrders(orders.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      logAnalyticsEvent('order_status_updated', { order_id: orderId, status: newStatus, updated_by: 'seller' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Statusni o\'zgartirish taqiqlangan.';
      alert('Xatolik (State Machine): ' + msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartChatFromOrder = async (order: Order) => {
    if (!storeUser || !order.buyer) return;

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
        const { data: buyerParticipants, error: buyerPartError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .in('chat_id', chatIds)
          .eq('user_id', order.buyer.id);

        if (buyerPartError) throw buyerPartError;

        if (buyerParticipants && buyerParticipants.length > 0) {
          targetChatId = buyerParticipants[0].chat_id;
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
        { chat_id: targetChatId, user_id: order.buyer.id }
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
        return 'bg-red-500/10 text-red-400 border-red-500/20';
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
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 w-full text-xs">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/seller/dashboard" 
          className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition duration-150"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-base font-bold text-slate-200">Kirim Buyurtmalari</h1>
          <p className="text-[10px] text-slate-400">Do&apos;konga tushgan yangi buyurtmalar</p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', name: 'Barchasi' },
          { id: 'pending', name: 'Kutilmoqda' },
          { id: 'confirmed', name: 'Tasdiqlangan' },
          { id: 'completed', name: 'Yetkazilgan' },
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
        <div className="py-16 text-center space-y-4 bg-slate-850/20 border border-dashed border-slate-700/30 rounded-2xl p-6">
          <ShoppingBag className="w-10 h-10 text-slate-650 mx-auto" />
          <p className="text-slate-450">Kirim buyurtmalari topilmadi.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((ord) => (
            <div 
              key={ord.id}
              className="bg-slate-800/45 border border-slate-700/45 rounded-2xl p-4 space-y-3.5 shadow-md"
            >
              {/* Order Meta Header */}
              <div className="flex justify-between items-start border-b border-slate-750/30 pb-2.5">
                <div>
                  <span className="font-bold text-emerald-450 text-xs block">{ord.order_number}</span>
                  <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(ord.created_at)}
                  </span>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(ord.status)}`}>
                  {getStatusText(ord.status)}
                </span>
              </div>

              {/* Buyer info */}
              <div className="flex justify-between items-center text-slate-200 font-semibold text-[10.5px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Mijoz: {ord.buyer?.first_name}</span>
                  {ord.buyer?.username && (
                    <span className="text-[9px] text-slate-500 font-normal">(@{ord.buyer.username})</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleStartChatFromOrder(ord)}
                  disabled={chatLoading === ord.id}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700/50 rounded-lg text-[9px] font-bold transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
                >
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  {chatLoading === ord.id ? '...' : 'Chat'}
                </button>
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
                      <span className="font-semibold text-slate-250 block truncate">{item.product_name}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5 block">
                        {item.quantity} dona x {formatPrice(item.product_price)} so&apos;m
                      </span>
                    </div>
                    <span className="font-bold text-slate-350 shrink-0">
                      {formatPrice(item.product_price * item.quantity)} so&apos;m
                    </span>
                  </div>
                ))}
              </div>

              {/* Delivery Details */}
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

              {/* Total & Action Buttons (Strict Transitions Enforced) */}
              <div className="flex flex-col gap-2.5 pt-2.5 border-t border-slate-750/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Jami summa:</span>
                  <span className="font-bold text-emerald-400 text-sm">{formatPrice(ord.total_price)} so&apos;m</span>
                </div>

                {/* State Machine controls */}
                {ord.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'cancelled')}
                      disabled={actionLoading === ord.id}
                      className="py-2 bg-red-950/20 hover:bg-red-950/45 text-red-400 border border-red-900/30 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rad etish
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'confirmed')}
                      disabled={actionLoading === ord.id}
                      className="py-2 bg-emerald-555 hover:bg-emerald-500/90 text-slate-900 bg-emerald-500 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-500/5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Tasdiqlash
                    </button>
                  </div>
                )}

                {ord.status === 'confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(ord.id, 'completed')}
                    disabled={actionLoading === ord.id}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-500/5"
                  >
                    <Check className="w-4 h-4" />
                    Topshirildi / Yakunlash
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { ChevronLeft, MapPin, Phone, ShoppingBag, ShieldCheck, CheckCircle2, ArrowRight, Store } from 'lucide-react';
import Link from 'next/link';
import { CartItem } from '@/store/slices/cartSlice';

interface OrderSuccessDetail {
  id: string;
  order_number: string;
  store_name: string;
  total_price: number;
}

export default function CheckoutPage() {
  const { user: storeUser, cartItems, clearCart } = useStore();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Success state
  const [successOrders, setSuccessOrders] = useState<OrderSuccessDetail[]>([]);

  useEffect(() => {
    if (storeUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContactPhone(storeUser.phone === 'not-verified' ? '' : storeUser.phone);
    }
  }, [storeUser]);

  // Group cart items by seller
  const grouped = cartItems.reduce((acc, item) => {
    if (!acc[item.seller_id]) {
      acc[item.seller_id] = {
        store_name: item.store_name,
        items: [],
      };
    }
    acc[item.seller_id].items.push(item);
    return acc;
  }, {} as Record<string, { store_name: string; items: CartItem[] }>);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeUser || cartItems.length === 0) return;

    if (!deliveryAddress.trim()) {
      return setError('Yetkazib berish manzili kiritilishi majburiy.');
    }
    if (!contactPhone.trim()) {
      return setError('Bog\'lanish telefon raqami kiritilishi majburiy.');
    }

    setSubmitting(true);
    setError(null);

    const createdOrders: OrderSuccessDetail[] = [];

    try {
      // Create an order for each seller group
      for (const [sellerId, group] of Object.entries(grouped)) {
        const sellerTotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // 1. Create order record
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            buyer_id: storeUser.id,
            seller_id: sellerId,
            status: 'pending',
            total_price: sellerTotal,
            delivery_address: deliveryAddress.trim(),
            contact_phone: contactPhone.trim(),
          })
          .select('id, order_number')
          .single();

        if (orderError || !orderData) {
          throw orderError || new Error('Buyurtma yaratishda xatolik yuz berdi.');
        }

        // 2. Create order items snapshots (CTO Decision 2)
        const itemsPayload = group.items.map((item) => ({
          order_id: orderData.id,
          product_id: item.product_id,
          product_name: item.title,         // snapshot name
          product_price: item.price,        // snapshot price
          product_image: item.image_url,    // snapshot image
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsPayload);

        if (itemsError) {
          // Cleanup order on error
          await supabase.from('orders').delete().eq('id', orderData.id);
          throw itemsError;
        }

        createdOrders.push({
          id: orderData.id,
          order_number: orderData.order_number,
          store_name: group.store_name,
          total_price: sellerTotal,
        });
      }

      // 3. Clear cart in Zustand (which also handles Supabase cart_items delete)
      await clearCart(storeUser.id);

      // Save order details to show in success screen
      setSuccessOrders(createdOrders);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Buyurtmani joylashda xatolik.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0 && successOrders.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 text-xs">
        <p className="text-slate-400">Rasmiylashtirish uchun savatcha bo&apos;sh.</p>
        <Link
          href="/cart"
          className="inline-flex px-4 py-2 bg-slate-800 text-emerald-450 rounded-xl font-semibold border border-slate-700/50"
        >
          Savatchaga qaytish
        </Link>
      </div>
    );
  }

  if (successOrders.length > 0) {
    /* Success Screen */
    return (
      <div className="py-8 text-center space-y-6 w-full max-w-sm mx-auto text-xs">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-455 border border-emerald-555/20 flex items-center justify-center mx-auto animate-bounce">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-100">Buyurtmangiz qabul qilindi!</h2>
          <p className="text-[11px] text-slate-450">Sotuvchilar buyurtmani tez orada ko&apos;rib chiqishadi.</p>
        </div>

        {/* Created orders sequential numbers */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 text-left space-y-3 shadow-md">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buyurtmalar raqamlari:</h3>
          <div className="divide-y divide-slate-700/45">
            {successOrders.map((ord) => (
              <div key={ord.id} className="py-2.5 flex justify-between items-center first:pt-0 last:pb-0">
                <div>
                  <span className="font-bold text-emerald-400 text-xs block">{ord.order_number}</span>
                  <span className="text-[9px] text-slate-500">{ord.store_name}</span>
                </div>
                <span className="font-bold text-slate-200">{formatPrice(ord.total_price)} so&apos;m</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/orders"
            className="py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/50 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            Buyurtmalarim
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/home"
            className="py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center transition active:scale-95 shadow-md shadow-emerald-500/5"
          >
            Bosh sahifa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 w-full text-xs">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/cart" 
          className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition duration-150"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-base font-bold text-slate-200">Rasmiylashtirish</h1>
          <p className="text-[10px] text-slate-400">Buyurtma va yetkazish tafsilotlari</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="space-y-4">
        {/* Form Fields */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 space-y-4 shadow-md">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Eltib berish manzili
          </h3>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-medium">To&apos;liq manzil (Tuman, mahalla, ko&apos;cha, uy raqami)</label>
            <textarea
              required
              rows={3}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Masalan: Farg'ona tumani, Vodil MFY, Do'stlik ko'chasi, 24-uy"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none resize-none focus:border-emerald-500/80 transition"
            />
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-750/30">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pt-1 pb-1">
              <Phone className="w-4 h-4 text-emerald-400" />
              Bog&apos;lanish uchun telefon
            </h3>
            <input
              type="text"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Masalan: +998901234567"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition"
            />
          </div>
        </div>

        {/* Order Summary Groups */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Buyurtma tarkibi</h3>

          {Object.entries(grouped).map(([sellerId, group]) => (
            <div 
              key={sellerId} 
              className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3.5 space-y-2.5 shadow-md"
            >
              <div className="flex items-center justify-between border-b border-slate-700/30 pb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  {group.store_name}
                </span>
                <span className="font-bold text-emerald-400">
                  {formatPrice(group.items.reduce((sum, item) => sum + item.price * item.quantity, 0))} so&apos;m
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.product_id} className="flex justify-between items-center text-[11px] text-slate-350">
                    <span className="truncate max-w-[200px]">{item.title}</span>
                    <span className="font-medium text-slate-300 shrink-0">
                      {item.quantity} {item.unit} x {formatPrice(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Payment Warning & Place Order */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 space-y-3.5 shadow-md">
          <div className="flex justify-between text-xs border-b border-slate-750/30 pb-3">
            <span className="text-slate-400 font-semibold">Jami to&apos;lov summasi:</span>
            <span className="text-sm font-bold text-emerald-400">{formatPrice(subtotal)} so&apos;m</span>
          </div>

          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[10px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>To&apos;lov yetkazib berilganda naqd yoki karta orqali amalga oshiriladi.</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/5 active:scale-95 disabled:opacity-50"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            {submitting ? 'Yuborilmoqda...' : 'Buyurtmani tasdiqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}

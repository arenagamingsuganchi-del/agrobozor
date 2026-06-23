'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/store';
import { ShoppingCart, Store, Trash2, Minus, Plus, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CartItem } from '@/store/slices/cartSlice';

export default function CartPage() {
  const router = useRouter();
  const { user: storeUser, cartItems, cartLoading, loadCart, updateQuantity, removeFromCart } = useStore();

  useEffect(() => {
    loadCart(storeUser?.id || null);
  }, [storeUser, loadCart]);

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

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val);
  };

  const handleCheckoutClick = () => {
    if (!storeUser) {
      alert('Sotib olishni davom ettirish uchun profil sahifasida ro\'yxatdan o\'tishingiz yoki tizimga kirishingiz lozim.');
      router.push('/profile');
    } else {
      router.push('/checkout');
    }
  };

  if (cartLoading && cartItems.length === 0) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-32 bg-slate-800 rounded-2xl"></div>
        <div className="h-20 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 w-full text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShoppingCart className="w-5 h-5 text-emerald-450" />
          <h1 className="text-base font-bold text-slate-200">Savat</h1>
        </div>
        <span className="text-[10px] bg-slate-800 border border-slate-700/50 px-2.5 py-1 rounded-full text-slate-400 font-bold">
          {cartItems.length} xil mahsulot
        </span>
      </div>

      {cartItems.length === 0 ? (
        /* Empty Cart State */
        <div className="py-20 text-center space-y-4 bg-slate-850/30 border border-dashed border-slate-700/30 rounded-2xl p-6">
          <ShoppingCart className="w-12 h-12 text-slate-505 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">Savat bo&apos;sh</h3>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Siz hali savatchaga mahsulot qo&apos;shmadingiz. Mahsulotlarni ko&apos;rish uchun bosh sahifaga o&apos;ting.
            </p>
          </div>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl text-xs transition duration-150 active:scale-95 shadow-md shadow-emerald-500/5"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Mahsulotlar katalogiga o&apos;tish
          </Link>
        </div>
      ) : (
        /* Cart Contents */
        <div className="space-y-4">
          
          {/* Groups of items */}
          {Object.entries(grouped).map(([sellerId, group]) => (
            <div 
              key={sellerId} 
              className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3.5 space-y-3.5 shadow-md"
            >
              {/* Seller Store Header */}
              <div className="flex items-center gap-2 border-b border-slate-700/30 pb-2.5">
                <Store className="w-4 h-4 text-emerald-450 shrink-0" />
                <span className="font-bold text-slate-200">{group.store_name}</span>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.product_id} className="flex gap-3 bg-slate-900/30 border border-slate-700/20 rounded-xl p-2.5">
                    {/* Image */}
                    <div className="relative w-14 h-14 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-700/30">
                      <Image
                        src={item.image_url || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=150'}
                        alt={item.title}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-200 truncate">{item.title}</h4>
                        <div className="text-[10px] text-emerald-455 font-bold mt-0.5">
                          {formatPrice(item.price)} <span className="text-[8px] text-slate-500 font-normal">so&apos;m / {item.unit}</span>
                        </div>
                      </div>

                      {/* Quantity Controls & Delete */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1, storeUser?.id || null)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-2 text-xs font-bold text-slate-200 min-w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1, storeUser?.id || null)}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product_id, storeUser?.id || null)}
                          className="text-red-400/80 hover:text-red-400 transition duration-150 p-1 rounded-lg bg-red-950/10 border border-red-950/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Cart Summary Card */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 space-y-3.5 shadow-md">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Hisob-kitob</h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-450">Ekinlar soni:</span>
                <span className="text-slate-200 font-bold">{totalItems} ta</span>
              </div>
              <div className="flex justify-between border-t border-slate-700/30 pt-2.5">
                <span className="text-slate-400 text-sm font-semibold">Jami summa:</span>
                <span className="text-sm font-bold text-emerald-450">{formatPrice(subtotal)} so&apos;m</span>
              </div>
            </div>

            <button
              onClick={handleCheckoutClick}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/5 active:scale-95 mt-2"
            >
              Rasmiylashtirishga o&apos;tish
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

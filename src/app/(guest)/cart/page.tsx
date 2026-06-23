'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/store';
import { 
  ShoppingCart, Trash2, Minus, Plus, ChevronRight, ArrowLeft, 
  ShieldCheck, Tag, CreditCard, Landmark, ShieldAlert 
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const { user: storeUser, cartItems, cartLoading, loadCart, updateQuantity, removeFromCart, clearCart } = useStore();

  useEffect(() => {
    loadCart(storeUser?.id || null);
  }, [storeUser, loadCart]);

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 0; // FREE
  const serviceTax = subtotal > 0 ? 2.45 : 0; // Fixed Mock tax matching screenshot ($2.45)
  const totalAmount = subtotal + serviceTax;

  const formatPrice = (val: number) => {
    // If subtotal is very small, we format as dollars or sums.
    // In database, prices are in sums (e.g. 245000 so'm). We display them in UZS or so'm format.
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

  const handleClearCart = async () => {
    if (!confirm('Savatni butunlay tozalashni xohlaysizmi?')) return;
    try {
      // Clear items locally or in DB via clearCart action
      if (clearCart) {
        await clearCart(storeUser?.id || null);
      } else {
        // Fallback if action is not in slice
        for (const item of cartItems) {
          await removeFromCart(item.product_id, storeUser?.id || null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (cartLoading && cartItems.length === 0) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-8 bg-white border border-slate-100 rounded w-1/3"></div>
        <div className="h-32 bg-white border border-slate-100 rounded-2xl"></div>
        <div className="h-20 bg-white border border-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 w-full text-xs">
      
      {/* Header Row */}
      <div className="flex items-center justify-between py-1 bg-transparent">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-extrabold text-slate-800">My Cart</h1>
          <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
            ({cartItems.length} items)
          </span>
        </div>
        
        {cartItems.length > 0 && (
          <button 
            onClick={handleClearCart}
            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition border border-rose-100 bg-rose-50/50 px-2 py-1 rounded-lg"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
            Clear
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        /* Empty Cart State */
        <div className="py-20 text-center space-y-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <ShoppingCart className="w-12 h-12 text-slate-350 mx-auto stroke-[1.5]" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-700">Savat bo&apos;sh</h3>
            <p className="text-[11px] text-slate-450 max-w-xs mx-auto">
              Siz hali savatchaga mahsulot qo&apos;shmadingiz. Bosh sahifaga o&apos;ting.
            </p>
          </div>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition duration-150 active:scale-95 shadow-sm shadow-emerald-700/10"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Bosh sahifaga o&apos;tish
          </Link>
        </div>
      ) : (
        /* Cart Contents */
        <div className="space-y-4">
          
          {/* Items List */}
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div 
                key={item.product_id} 
                className="flex gap-3 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm relative group hover:border-slate-200 transition duration-150"
              >
                {/* Delete Button (top right) */}
                <button
                  onClick={() => removeFromCart(item.product_id, storeUser?.id || null)}
                  className="absolute top-3 right-3 text-slate-350 hover:text-rose-600 transition duration-150 p-1 rounded-full hover:bg-slate-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 stroke-[2]" />
                </button>

                {/* Product Image */}
                <div className="relative w-16 h-16 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                  <Image
                    src={item.image_url || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=150'}
                    alt={item.title}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0 flex flex-col justify-between pr-4">
                  <div className="space-y-0.5">
                    {/* Verified Seller badge */}
                    <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-650 uppercase tracking-wide">
                      <ShieldCheck className="w-3 h-3 fill-emerald-50 text-emerald-650 shrink-0" />
                      <span>Verified Seller</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.title}</h4>
                    <span className="text-[10px] text-slate-450 font-medium block truncate">
                      {item.store_name}
                    </span>
                  </div>

                  {/* Quantity and Price */}
                  <div className="flex items-center justify-between pt-2">
                    {/* Price */}
                    <div className="text-emerald-700 font-extrabold text-[13px]">
                      {formatPrice(item.price)} <span className="text-[8px] text-slate-400 font-normal">so&apos;m / {item.unit}</span>
                    </div>

                    {/* Quantity controller */}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full p-0.5">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1, storeUser?.id || null)}
                        className="w-5.5 h-5.5 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 transition shadow-sm active:scale-90 cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
                      </button>
                      <span className="px-2.5 text-xs font-bold text-slate-750 min-w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1, storeUser?.id || null)}
                        className="w-5.5 h-5.5 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 transition shadow-sm active:scale-90 cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Order Summary</h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-655 font-medium">
                <span>Subtotal</span>
                <span className="text-slate-800 font-bold">{formatPrice(subtotal)} so&apos;m</span>
              </div>
              <div className="flex justify-between text-slate-655 font-medium">
                <span>Delivery Fee</span>
                <span className="text-emerald-600 font-bold uppercase text-[10px]">
                  {deliveryFee === 0 ? 'FREE' : `${formatPrice(deliveryFee)} so'm`}
                </span>
              </div>
              <div className="flex justify-between text-slate-655 font-medium pb-2 border-b border-slate-100">
                <span>Est. Service Tax</span>
                <span className="text-slate-800 font-bold">{formatPrice(serviceTax)} so&apos;m</span>
              </div>
              
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-slate-800 text-sm font-bold">Total Amount</span>
                <span className="text-base font-extrabold text-emerald-700">{formatPrice(totalAmount)} so&apos;m</span>
              </div>
            </div>

            {/* Promo Code Box */}
            <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-500">
              <Tag className="w-4 h-4 text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Promo code" 
                className="bg-transparent border-none outline-none flex-1 text-slate-750 placeholder-slate-400"
              />
              <button className="text-[10px] font-bold text-slate-400 hover:text-emerald-700 transition uppercase cursor-pointer">
                Apply
              </button>
            </div>

            {/* Proceed to Checkout Button */}
            <button
              onClick={handleCheckoutClick}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-lg active:scale-98 cursor-pointer"
            >
              Proceed to Checkout
              <ChevronRight className="w-4 h-4 shrink-0 stroke-[2.5]" />
            </button>
          </div>

          {/* Secure Fintech Footer */}
          <div className="flex flex-col items-center justify-center space-y-1.5 pt-1 text-slate-400">
            <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-350 fill-slate-50" />
              <span>Secure Fintech Payment</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-slate-350">
              <CreditCard className="w-5 h-5 stroke-[1.8]" />
              <Landmark className="w-5 h-5 stroke-[1.8]" />
              <ShieldAlert className="w-5 h-5 stroke-[1.8]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

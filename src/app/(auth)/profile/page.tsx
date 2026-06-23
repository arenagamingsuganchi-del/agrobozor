'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { User, Store, ShieldCheck, ClipboardList, ArrowRight, UserCheck, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

interface SellerProfile {
  id: string;
  store_name: string;
  description: string | null;
  is_verified: boolean;
}

export default function ProfilePage() {
  const { user: storeUser, setAuth } = useStore();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingRole, setSwitchingRole] = useState(false);

  const toggleUserRole = async () => {
    if (!storeUser) return;
    try {
      setSwitchingRole(true);
      const newRole = storeUser.role === 'admin' ? 'buyer' : 'admin';
      
      const { error } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', storeUser.id);

      if (error) {
        alert('Rolni o\'zgartirishda xatolik: ' + error.message);
      } else {
        setAuth({ ...storeUser, role: newRole }, 'local-session-token');
      }
    } catch (err) {
      console.error('Role switcher error:', err);
    } finally {
      setSwitchingRole(false);
    }
  };

  // Form states
  const [isRegistering, setIsRegistering] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    async function loadSellerProfile() {
      if (!storeUser) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sellers')
          .select('id, store_name, description, is_verified')
          .eq('user_id', storeUser.id)
          .single();

        if (data && !error) {
          setSeller(data);
        }
      } catch (err) {
        console.error('Failed to load seller status:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSellerProfile();
  }, [storeUser, formSuccess]);

  const handleRegisterSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeUser) return;
    if (!storeName.trim()) {
      setFormError('Do\'kon nomini kiritish majburiy.');
      return;
    }

    try {
      setFormError(null);
      const { data, error } = await supabase
        .from('sellers')
        .insert({
          user_id: storeUser.id,
          store_name: storeName.trim(),
          description: description.trim() || null,
          is_verified: false,
        })
        .select()
        .single();

      if (error) {
        setFormError(error.message);
      } else if (data) {
        setFormSuccess(true);
        setIsRegistering(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ro\'yxatdan o\'tishda xatolik yuz berdi.';
      setFormError(message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-32 bg-slate-800 rounded-2xl"></div>
        <div className="h-20 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 w-full text-xs">
      {/* Header */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-emerald-450">Shaxsiy Profil</h1>
        <p className="text-[10px] text-slate-400">Akkaunt ma&apos;lumotlari va do&apos;kon sozlamalari</p>
      </div>

      {/* User Info Block */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-3.5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-200">{storeUser?.first_name}</h2>
            <p className="text-[10px] text-slate-400">ID: {storeUser?.telegram_id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 pt-3 border-t border-slate-700/30 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-450">Telefon:</span>
            <span className="text-slate-200">{storeUser?.phone}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-450">Sizning rolingiz:</span>
            <div className="flex items-center gap-2">
              <span className="capitalize text-emerald-450 font-semibold">{storeUser?.role}</span>
              <button
                type="button"
                disabled={switchingRole}
                onClick={toggleUserRole}
                className="px-2 py-0.5 bg-slate-700 hover:bg-slate-650 hover:text-emerald-400 text-slate-350 border border-slate-650 rounded-lg text-[9px] font-bold transition active:scale-95 disabled:opacity-50"
              >
                {switchingRole ? '...' : 'O\'zgartirish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Actions Menu */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-3 shadow-md">
        <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-750/30 pb-2">Mening faoliyatim</h3>
        <div className="divide-y divide-slate-750/30">
          <Link
            href="/orders"
            className="flex items-center justify-between py-2.5 hover:text-emerald-450 transition first:pt-0"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-450" />
              <span className="text-slate-250 font-semibold">Mening xaridlarim (Buyurtmalar)</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-550" />
          </Link>

          {storeUser?.role === 'admin' && (
            <Link
              href="/admin/dashboard"
              className="flex items-center justify-between py-2.5 hover:text-emerald-450 transition"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-450" />
                <span className="text-slate-250 font-semibold">Admin Panel (Boshqaruv)</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-550" />
            </Link>
          )}
          
          {seller && (
            <Link
              href="/seller/orders"
              className="flex items-center justify-between py-2.5 hover:text-emerald-450 transition last:pb-0"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-450" />
                <span className="text-slate-250 font-semibold">Kirim buyurtmalari (Do&apos;kon)</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-550" />
            </Link>
          )}
        </div>
      </div>

      {/* Seller Status / Registration Block */}
      {seller ? (
        /* Verified/Registered Seller Profile */
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-700/30 pb-3">
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-emerald-450" />
              <div>
                <h3 className="text-sm font-semibold text-slate-200">{seller.store_name}</h3>
                <p className="text-[10px] text-slate-400">Faol Sotuvchi do&apos;koni</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              {seller.is_verified ? 'Tasdiqlangan' : 'Kutilmoqda'}
            </div>
          </div>

          {seller.description && (
            <p className="text-xs text-slate-400 leading-relaxed italic">
              &quot;{seller.description}&quot;
            </p>
          )}

          {/* Action to Dashboard */}
          <Link
            href="/seller/dashboard"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5"
          >
            <Store className="w-4 h-4" />
            Sotuvchi boshqaruv paneliga o&apos;tish
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : isRegistering ? (
        /* Seller Registration Form */
        <form onSubmit={handleRegisterSeller} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-4 shadow-md">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-700/30">
            <Store className="w-5 h-5 text-emerald-450" />
            <h3 className="text-sm font-semibold text-slate-200">Sotuvchi ro&apos;yxatdan o&apos;tishi</h3>
          </div>

          {formError && (
            <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Do&apos;kon yoki Brend nomi (Majburiy)</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Masalan: Farg'ona Urug'chilik"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition duration-150"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Faoliyat haqida tavsif (Ixtiyoriy)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mahsulotlaringiz, yetkazish shartlari haqida yozing..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition duration-150 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className="py-2.5 bg-slate-750 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition duration-150"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-xl text-xs font-semibold transition duration-150 flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              Tizimda ochish
            </button>
          </div>
        </form>
      ) : (
        /* CTA to Register */
        <div className="bg-slate-800/30 border border-slate-700/30 border-dashed rounded-2xl p-6 text-center space-y-4">
          <Store className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">Mahsulot sotmoqchimisiz?</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              AgroBozor-da o&apos;z do&apos;koningizni oching va mahsulotlaringizni O&apos;zbekiston bo&apos;ylab fermerlarga soting.
            </p>
          </div>
          <button
            onClick={() => setIsRegistering(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700/50 text-emerald-450 rounded-xl text-xs font-semibold transition duration-150"
          >
            Sotuvchi sifatidagi ro&apos;yxatdan o&apos;tish
          </button>
        </div>
      )}
    </div>
  );
}

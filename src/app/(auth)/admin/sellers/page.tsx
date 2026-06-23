'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Store, ShieldCheck, ShieldAlert, Phone, User, Calendar, Loader2 } from 'lucide-react';

interface Seller {
  id: string;
  store_name: string;
  description: string | null;
  is_verified: boolean;
  created_at: string;
  users: {
    first_name: string;
    phone: string;
  } | null;
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadSellers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sellers')
        .select(`
          id,
          store_name,
          description,
          is_verified,
          created_at,
          users (
            first_name,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setSellers(data as unknown as Seller[]);
      } else if (error) {
        console.error('Failed to load sellers:', error.message);
      }
    } catch (err) {
      console.error('Unexpected error loading sellers:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSellers();
  }, []);

  const handleToggleVerify = async (sellerId: string, currentStatus: boolean) => {
    try {
      setActionLoading(sellerId);
      const newStatus = !currentStatus;

      const { error } = await supabase
        .from('sellers')
        .update({ is_verified: newStatus, updated_at: new Date().toISOString() })
        .eq('id', sellerId);

      if (error) {
        alert('Statusni o\'zgartirishda xatolik: ' + error.message);
      } else {
        setSellers((prev) =>
          prev.map((s) => (s.id === sellerId ? { ...s, is_verified: newStatus } : s))
        );
      }
    } catch (err) {
      console.error('Verify error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-28 bg-slate-800 rounded-2xl"></div>
        <div className="h-28 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full text-xs">
      <div className="flex flex-col space-y-0.5">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
          <Store className="w-4.5 h-4.5 text-emerald-450" />
          Sotuvchilar Ro&apos;yxati
        </h2>
        <p className="text-[10px] text-slate-400">Tizimda ro&apos;yxatdan o&apos;tgan sotuvchi do&apos;konlari boshqaruvi</p>
      </div>

      {sellers.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-slate-850/20 border border-dashed border-slate-700/30 rounded-2xl p-6">
          <Store className="w-12 h-12 text-slate-650 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">Sotuvchilar mavjud emas</h3>
            <p className="text-[11px] text-slate-455 max-w-xs mx-auto">
              Hozircha hech qanday sotuvchi do&apos;koni ro&apos;yxatdan o&apos;tkazilmagan.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {sellers.map((seller) => (
            <div
              key={seller.id}
              className={`bg-slate-850/50 border rounded-2xl p-4 space-y-3 shadow-sm hover:shadow transition duration-150 ${
                seller.is_verified ? 'border-emerald-500/10' : 'border-slate-700/40'
              }`}
            >
              {/* Header: Store details & Toggle Verify */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-250 truncate">{seller.store_name}</h3>
                    {seller.is_verified ? (
                      <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    )}
                  </div>
                  {seller.description && (
                    <p className="text-[10px] text-slate-400 italic line-clamp-2 leading-relaxed">
                      &quot;{seller.description}&quot;
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={actionLoading === seller.id}
                  onClick={() => handleToggleVerify(seller.id, seller.is_verified)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition text-[9px] shrink-0 active:scale-95 flex items-center gap-1.5 ${
                    seller.is_verified
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-900 border border-emerald-450 shadow-md shadow-emerald-500/5'
                  }`}
                >
                  {actionLoading === seller.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : seller.is_verified ? (
                    'Bekor qilish'
                  ) : (
                    'Tasdiqlash'
                  )}
                </button>
              </div>

              {/* Owner details */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-750/30 text-[10px] text-slate-400 font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate text-slate-300">{seller.users?.first_name || 'Ismsiz'}</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <a
                    href={`tel:${seller.users?.phone || ''}`}
                    className="hover:text-emerald-400 transition"
                  >
                    {seller.users?.phone || 'Telefon kiritilmagan'}
                  </a>
                </div>

                <div className="flex items-center gap-1.5 col-span-2 text-[9px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Ro&apos;yxatdan o&apos;tdi: {formatDate(seller.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

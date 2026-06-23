'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/store';
import { ClipboardList, Store, Calendar, ArrowRight, CheckSquare, Square, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface PendingProduct {
  id: string;
  title: string;
  price: number;
  unit: string;
  created_at: string;
  sellers: { store_name: string } | null;
  subcategories: { name: string } | null;
  product_images: { image_url: string }[];
}

export default function ModerationQueuePage() {
  const { user: storeUser } = useStore();

  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadPendingQueue() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price,
          unit,
          created_at,
          sellers (
            store_name
          ),
          subcategories (
            name
          ),
          product_images (
            image_url
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (data && !error) {
        setProducts(data as unknown as PendingProduct[]);
        setSelectedIds([]);
      } else if (error) {
        console.error('Failed to load pending queue:', error.message);
      }
    } catch (err) {
      console.error('Unexpected error loading queue:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPendingQueue();
  }, []);

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const handleSelectCount = (count: number) => {
    const idsToSelect = products.slice(0, count).map((p) => p.id);
    setSelectedIds(idsToSelect);
  };

  // Bulk Approval Action (CTO Decision 2)
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0 || !storeUser) return;
    if (!confirm(`Haqiqatdan ham tanlangan ${selectedIds.length} ta mahsulotni tasdiqlamoqchimisiz?`)) return;

    try {
      setActionLoading(true);

      // 1. Update status to 'active' for all selected ids in DB
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .in('id', selectedIds);

      if (updateError) throw updateError;

      // 2. Insert moderation audit logs (CTO Decision 1 & 2)
      const logsPayload = selectedIds.map((id) => ({
        product_id: id,
        admin_id: storeUser.id,
        old_status: 'pending',
        new_status: 'active',
        reason: 'Bulk approved by Admin',
      }));

      const { error: logsError } = await supabase
        .from('product_moderation_logs')
        .insert(logsPayload);

      if (logsError) {
        console.error('Failed to create moderation logs:', logsError.message);
      }

      // Success
      alert('Tanlangan mahsulotlar muvaffaqiyatli tasdiqlandi.');
      await loadPendingQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tasdiqlashda xatolik yuz berdi.';
      alert(msg);
    } finally {
      setActionLoading(false);
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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-24 bg-slate-800 rounded-2xl"></div>
        <div className="h-24 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full text-xs">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-0.5">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <ClipboardList className="w-4.5 h-4.5 text-emerald-450" />
            Moderatsiya Navbati
          </h2>
          <p className="text-[10px] text-slate-400">Tekshirilishi kutilayotgan e&apos;lonlar</p>
        </div>

        {products.length > 0 && (
          <div className="flex gap-2">
            <div className="flex bg-slate-800/80 border border-slate-700/50 rounded-xl overflow-hidden text-[9px] font-bold">
              <span className="px-2 py-1.5 text-slate-400 border-r border-slate-700/50 flex items-center">Tezkor:</span>
              {[5, 10, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSelectCount(num)}
                  disabled={products.length < num && products.length <= (num - 5)}
                  className="px-2.5 py-1.5 hover:bg-slate-750 text-emerald-400 border-r border-slate-700/50 last:border-0 transition disabled:opacity-30"
                >
                  {num} ta
                </button>
              ))}
            </div>

            <button
              onClick={handleToggleSelectAll}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700/60 rounded-xl hover:text-slate-200 transition text-[10px] flex items-center gap-1"
            >
              {selectedIds.length === products.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  Bekor qilish
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Hammasi
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        /* Empty State */
        <div className="py-20 text-center space-y-4 bg-slate-850/20 border border-dashed border-slate-700/30 rounded-2xl p-6">
          <ClipboardList className="w-12 h-12 text-slate-650 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">Moderatsiya navbati bo&apos;sh</h3>
            <p className="text-[11px] text-slate-455 max-w-xs mx-auto">
              Hozirda tekshirish talab etiladigan e&apos;lonlar mavjud emas. Barcha mahsulotlar ko&apos;rib chiqilgan.
            </p>
          </div>
        </div>
      ) : (
        /* Moderation List */
        <div className="space-y-4">
          
          {/* Bulk Action Panel (CTO Decision 2) */}
          {selectedIds.length > 0 && (
            <div className="bg-slate-850 border border-emerald-500/10 p-3.5 rounded-2xl flex justify-between items-center shadow-lg animate-in slide-in-from-bottom-2 duration-200">
              <span className="font-semibold text-slate-250">
                {selectedIds.length} ta mahsulot tanlandi
              </span>
              <button
                onClick={handleBulkApprove}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl text-[10px] flex items-center gap-1 active:scale-95 disabled:opacity-50 transition"
              >
                <Check className="w-3.5 h-3.5" />
                Hammasini tasdiqlash (Bulk)
              </button>
            </div>
          )}

          {/* Pending items cards */}
          <div className="space-y-3">
            {products.map((prod) => {
              const isSelected = selectedIds.includes(prod.id);
              return (
                <div 
                  key={prod.id} 
                  className={`bg-slate-850/50 border rounded-2xl p-3 flex gap-3 shadow-sm hover:shadow transition relative ${
                    isSelected ? 'border-emerald-500/40 ring-1 ring-emerald-500/10' : 'border-slate-700/40'
                  }`}
                >
                  {/* Select Checkbox (CTO Decision 2) */}
                  <button
                    onClick={() => handleToggleSelect(prod.id)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-emerald-400 transition"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  {/* Thumbnail */}
                  <div className="relative w-16 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-700/30">
                    <Image
                      src={prod.product_images?.[0]?.image_url || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=150'}
                      alt={prod.title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-6 space-y-1">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 truncate">{prod.title}</h4>
                      <span className="text-[9px] text-slate-500">{prod.subcategories?.name}</span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{prod.sellers?.store_name}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-750/30">
                      <span className="font-bold text-emerald-400">
                        {formatPrice(prod.price)} <span className="text-[8px] text-slate-500 font-normal">so&apos;m / {prod.unit}</span>
                      </span>
                      <span className="text-[8px] text-slate-500 flex items-center gap-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(prod.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Single Review Link */}
                  <div className="flex flex-col justify-end pl-2 border-l border-slate-700/30 shrink-0">
                    <Link
                      href={`/admin/review/${prod.id}`}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-lg flex items-center justify-center transition border border-slate-700/50"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

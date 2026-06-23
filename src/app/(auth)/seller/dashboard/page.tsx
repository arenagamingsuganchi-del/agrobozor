'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { ChevronLeft, Plus, Eye, MessageSquare, Package, Edit, Trash2, ShieldCheck, MapPin, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  title: string;
  price: number;
  unit: string;
  status: 'draft' | 'pending' | 'active' | 'rejected' | 'archived';
  regions: { name: string } | null;
  product_images: { image_url: string }[];
}

interface SellerProfile {
  id: string;
  store_name: string;
  is_verified: boolean;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user: storeUser } = useStore();
  
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Stats (CTO Decision 1: Seller Analytics)
  const [viewCount] = useState(142); // Placeholder view counter
  const [contactCount] = useState(18); // Placeholder contact counter

  useEffect(() => {
    async function loadSellerData() {
      if (!storeUser) return;
      try {
        setLoading(true);
        // 1. Fetch seller profile
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('id, store_name, is_verified')
          .eq('user_id', storeUser.id)
          .single();

        if (sellerError || !sellerData) {
          router.replace('/profile');
          return;
        }

        setSeller(sellerData);

        // 2. Fetch seller's products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            title,
            price,
            unit,
            status,
            regions (name),
            product_images (image_url)
          `)
          .eq('seller_id', sellerData.id)
          .order('created_at', { ascending: false });

        if (productsData && !productsError) {
          setProducts(productsData as unknown as Product[]);
        }
      } catch (err) {
        console.error('Failed to load seller dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSellerData();
  }, [storeUser, router]);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Haqiqatdan ham ushbu mahsulotni o\'chirmoqchimisiz?')) return;
    try {
      // Perform direct delete
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        alert('O\'chirishda xatolik: ' + error.message);
      } else {
        setProducts(products.filter((p) => p.id !== id));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      alert(message);
    }
  };

  const getStatusBadge = (status: Product['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'draft':
        return 'bg-slate-500/10 text-slate-400 border-slate-700/50';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusText = (status: Product['status']) => {
    switch (status) {
      case 'active': return 'Faol';
      case 'pending': return 'Kutilmoqda';
      case 'rejected': return 'Rad etilgan';
      case 'draft': return 'Qoralama';
      default: return status;
    }
  };

  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'all') {
      return p.status === 'active' || p.status === 'pending';
    }
    return p.status === statusFilter;
  });

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 bg-slate-800 rounded-xl"></div>
          <div className="h-16 bg-slate-800 rounded-xl"></div>
          <div className="h-16 bg-slate-800 rounded-xl"></div>
        </div>
        <div className="h-40 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <Link 
          href="/profile" 
          className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition duration-150"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-800/40 px-2.5 py-1 rounded-full border border-slate-700/30">
          <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          {seller?.store_name}
          {seller?.is_verified && (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
        </div>
      </div>

      {/* Analytics (CTO Decision 1: Seller Analytics) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Products Count */}
        <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl flex flex-col items-center justify-center text-center space-y-1.5">
          <Package className="w-4 h-4 text-emerald-400" />
          <span className="text-base font-bold text-slate-100">{products.length}</span>
          <span className="text-[9px] text-slate-500 font-medium">Mahsulotlar</span>
        </div>

        {/* View Count (Placeholder) */}
        <div className="relative p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl flex flex-col items-center justify-center text-center space-y-1.5 group">
          <Eye className="w-4 h-4 text-sky-400" />
          <span className="text-base font-bold text-slate-100">{viewCount}</span>
          <span className="text-[9px] text-slate-500 font-medium flex items-center gap-0.5">
            Ko&apos;rishlar
            <span className="text-[7px] text-emerald-500 font-bold">*</span>
          </span>
        </div>

        {/* Contact Count (Placeholder) */}
        <div className="relative p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl flex flex-col items-center justify-center text-center space-y-1.5">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span className="text-base font-bold text-slate-100">{contactCount}</span>
          <span className="text-[9px] text-slate-500 font-medium flex items-center gap-0.5">
            Bog&apos;lanish
            <span className="text-[7px] text-emerald-500 font-bold">*</span>
          </span>
        </div>
      </div>

      {/* Action Buttons & Filter Row */}
      <div className="flex items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-xs focus:outline-none"
        >
          <option value="all">Asosiy oqim (Faol va Kutilayotgan)</option>
          <option value="active">Faol</option>
          <option value="pending">Kutilayotgan</option>
          <option value="draft">Qoralama (Draft)</option>
          <option value="rejected">Rad etilgan</option>
        </select>

        <Link
          href="/seller/add-product"
          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Qo&apos;shish
        </Link>
      </div>

      {/* Products list */}
      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6 text-slate-500 text-xs">
            Mahsulotlar topilmadi.
          </div>
        ) : (
          filteredProducts.map((prod) => (
            <div 
              key={prod.id} 
              className="bg-slate-850/50 border border-slate-700/40 rounded-2xl p-3 flex gap-3 shadow-sm hover:shadow transition"
            >
              {/* Product Thumbnail */}
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

              {/* Product Info & Status */}
              <div className="flex-1 min-w-0 space-y-1.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 truncate leading-snug">{prod.title}</h4>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{prod.regions?.name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-emerald-400">
                    {formatPrice(prod.price)} <span className="text-[9px] text-slate-500 font-normal">so&apos;m / {prod.unit}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${getStatusBadge(prod.status)}`}>
                    {getStatusText(prod.status)}
                  </span>
                </div>
              </div>

              {/* CRUD Action Buttons */}
              <div className="flex flex-col justify-between pl-2 border-l border-slate-700/30 shrink-0 gap-1.5">
                <Link
                  href={`/seller/edit-product/${prod.id}`}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg flex items-center justify-center transition border border-slate-700/50"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => handleDeleteProduct(prod.id)}
                  className="w-7 h-7 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-lg flex items-center justify-center transition border border-red-900/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

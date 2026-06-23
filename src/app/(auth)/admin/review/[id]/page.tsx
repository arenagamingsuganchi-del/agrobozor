'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/store';
import { ChevronLeft, MapPin, Store, Calendar, ShieldCheck, Tag, Check, XCircle, ShieldAlert } from 'lucide-react';
import Image from 'next/image';

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

interface ProductDetails {
  id: string;
  title: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  status: 'draft' | 'pending' | 'active' | 'rejected' | 'archived';
  created_at: string;
  regions: { name: string } | null;
  sellers: { store_name: string; is_verified: boolean } | null;
  subcategories: { name: string; categories: { name: string } | null } | null;
  product_images: ProductImage[];
}

export default function ProductReviewPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { user: storeUser } = useStore();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  
  // Moderation action states
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    async function loadProductForReview() {
      if (!productId) return;
      try {
        setLoading(true);
        const { data, error: prodError } = await supabase
          .from('products')
          .select(`
            id,
            title,
            description,
            price,
            unit,
            stock,
            status,
            created_at,
            regions (name),
            sellers (
              store_name,
              is_verified
            ),
            subcategories (
              name,
              categories (name)
            ),
            product_images (
              id,
              image_url,
              is_primary
            )
          `)
          .eq('id', productId)
          .single();

        if (data && !prodError) {
          const prodDetails = data as unknown as ProductDetails;
          setProduct(prodDetails);
          
          const primaryImg = prodDetails.product_images?.find((img) => img.is_primary) || prodDetails.product_images?.[0];
          if (primaryImg) {
            setActiveImage(primaryImg.image_url);
          }
        } else if (prodError) {
          setError('E\'lon ma\'lumotlarini yuklashda xatolik: ' + prodError.message);
        }
      } catch (err) {
        console.error('Failed to load review details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProductForReview();
  }, [productId]);

  const handleApprove = async () => {
    if (!product || !storeUser) return;
    if (!confirm('Ushbu mahsulotni tasdiqlab, katalogda faol sotuvga chiqarmoqchimisiz?')) return;

    try {
      setActionLoading(true);
      setError(null);

      // 1. Update status to 'active'
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (updateError) throw updateError;

      // 2. Insert audit trail log (CTO Decision 1)
      const { error: logError } = await supabase
        .from('product_moderation_logs')
        .insert({
          product_id: product.id,
          admin_id: storeUser.id,
          old_status: product.status,
          new_status: 'active',
          reason: 'Approved by admin',
        });

      if (logError) console.error('Failed to write audit log:', logError.message);

      alert('Mahsulot muvaffaqiyatli tasdiqlandi va faollashtirildi.');
      router.push('/admin/moderation');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tasdiqlashda xatolik yuz berdi.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !storeUser) return;

    if (!rejectReason.trim()) {
      return alert('Rad etish sababini kiritish majburiy.');
    }

    try {
      setActionLoading(true);
      setError(null);

      // 1. Update status to 'rejected'
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (updateError) throw updateError;

      // 2. Insert audit trail log with rejection reason (CTO Decision 1 & 3)
      const { error: logError } = await supabase
        .from('product_moderation_logs')
        .insert({
          product_id: product.id,
          admin_id: storeUser.id,
          old_status: product.status,
          new_status: 'rejected',
          reason: rejectReason.trim(),
        });

      if (logError) throw logError;

      alert('Mahsulot rad etildi va sotuvchiga qaytarildi.');
      router.push('/admin/moderation');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rad etishda xatolik yuz berdi.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-6 w-full animate-pulse p-4">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="aspect-square bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-16 text-center space-y-4 text-xs">
        <p className="text-slate-400">Tekshiriladigan mahsulot topilmadi.</p>
        <button
          onClick={() => router.back()}
          className="inline-flex px-4 py-2 bg-slate-800 text-emerald-450 border border-slate-700 rounded-xl"
        >
          Orqaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full text-xs">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition duration-150"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-800/40 px-2.5 py-1 rounded-full border border-slate-700/30">
          Kategoriya: {product.subcategories?.categories?.name}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Image Viewer */}
      <div className="space-y-3">
        <div className="relative aspect-square w-full bg-slate-950 border border-slate-700/30 rounded-2xl overflow-hidden shadow-lg">
          {activeImage ? (
            <Image
              src={activeImage}
              alt={product.title}
              width={400}
              height={400}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
              Rasm yuklanmagan
            </div>
          )}
        </div>

        {/* Image Thumbnails list */}
        {product.product_images && product.product_images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {product.product_images.map((img) => (
              <button
                key={img.id}
                onClick={() => setActiveImage(img.image_url)}
                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition duration-150 ${
                  activeImage === img.image_url ? 'border-emerald-400 scale-95' : 'border-slate-700/50'
                }`}
              >
                <Image 
                  src={img.image_url} 
                  alt="thumbnail" 
                  width={56} 
                  height={56} 
                  className="w-full h-full object-cover" 
                  unoptimized 
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Information Block */}
      <div className="space-y-4 bg-slate-800/40 border border-slate-700/40 p-4 rounded-2xl shadow-md">
        <div className="flex justify-between items-start">
          <h1 className="text-base font-bold text-slate-100 pr-4">{product.title}</h1>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 uppercase font-bold text-[8px] tracking-wider shrink-0 mt-0.5">
            {product.status === 'pending' ? 'Kutilmoqda' : product.status}
          </span>
        </div>

        <div className="flex items-baseline gap-2.5">
          <div className="text-base font-bold text-emerald-400">
            {formatPrice(product.price)} <span className="text-[9px] font-normal text-slate-400">so&apos;m / {product.unit}</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/30 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">{product.regions?.name || 'O\'zbekiston'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">{product.subcategories?.name}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 col-span-2">
            <Store className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate flex items-center gap-1 font-medium">
              Do&apos;kon: {product.sellers?.store_name}
              {product.sellers?.is_verified && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 col-span-2">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Yaratildi: {formatDate(product.created_at)}</span>
          </div>
        </div>

        <div className="space-y-1.5 pt-3 border-t border-slate-700/30">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tavsif</h2>
          <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      </div>

      {/* Moderation actions */}
      {!showRejectForm ? (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={actionLoading}
            className="py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-red-400 font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Rad etish
          </button>
          
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 shadow-md shadow-emerald-500/5"
          >
            <Check className="w-4 h-4" />
            Tasdiqlash
          </button>
        </div>
      ) : (
        /* Rejection Reason Form (CTO Decision 1 & 3) */
        <form onSubmit={handleReject} className="bg-slate-850/65 border border-red-950/25 rounded-2xl p-4 space-y-3.5 shadow-lg animate-in slide-in-from-bottom-2 duration-200">
          <h3 className="font-bold text-slate-200 text-xs border-b border-slate-700/30 pb-2">
            Rad etish sababini kiriting (Sotuvchiga yuboriladi)
          </h3>
          
          <div className="space-y-1.5">
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masalan: Mahsulot tavsifi juda qisqa yoki rasm sifati yomon..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500/80 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason('');
              }}
              className="py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-350 rounded-xl font-bold transition"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="py-2.5 bg-red-600 hover:bg-red-700 text-slate-100 rounded-xl font-bold transition flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 shadow-md"
            >
              Sababni yuborish
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

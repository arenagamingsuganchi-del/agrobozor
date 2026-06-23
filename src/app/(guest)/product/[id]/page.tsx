'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/store';
import { ChevronLeft, MapPin, Store, Calendar, ShieldCheck, Tag, ShoppingCart, MessageSquare, Minus, Plus, Check } from 'lucide-react';
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
  sellers: { id: string; user_id: string; store_name: string; is_verified: boolean; users: { phone: string } | null } | null;
  subcategories: { name: string; categories: { name: string } | null } | null;
  product_images: ProductImage[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { user: storeUser, addToCart } = useStore();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  
  // Quantity State & Feedback
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    async function loadProductDetails() {
      if (!productId) return;
      try {
        setLoading(true);

        const { data, error } = await supabase
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
              id,
              user_id,
              store_name,
              is_verified,
              users (phone)
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

        if (data && !error) {
          const prodDetails = data as unknown as ProductDetails;
          setProduct(prodDetails);
          
          // Set primary image or first image as active
          const primaryImg = prodDetails.product_images?.find((img) => img.is_primary) || prodDetails.product_images?.[0];
          if (primaryImg) {
            setActiveImage(primaryImg.image_url);
          }
        } else if (error) {
          console.error('Error loading product details:', error.message);
        }
      } catch (err) {
        console.error('Unexpected error loading details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProductDetails();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      const primaryImg = product.product_images?.find((img) => img.is_primary) || product.product_images?.[0];
      await addToCart({
        product_id: product.id,
        title: product.title,
        price: product.price,
        unit: product.unit,
        quantity: quantity,
        image_url: primaryImg ? primaryImg.image_url : null,
        seller_id: product.sellers?.id || '',
        store_name: product.sellers?.store_name || 'Agro Seller',
        stock: product.stock,
      }, storeUser?.id || null);

      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const [chatLoading, setChatLoading] = useState(false);

  const handleStartChat = async () => {
    if (!storeUser) {
      alert("Muloqot boshlash uchun iltimos profil bo'limida ro'yxatdan o'ting.");
      router.push('/profile');
      return;
    }

    if (!product || !product.sellers) return;

    if (storeUser.id === product.sellers.user_id) {
      alert("O'z mahsulotingiz bo'yicha o'zingiz bilan suhbat boshlay olmaysiz.");
      return;
    }

    try {
      setChatLoading(true);

      // Check if a chat already exists for this product between this buyer and seller
      const { data: existingChats, error: queryError } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats!inner (
            id,
            product_id
          )
        `)
        .eq('user_id', storeUser.id)
        .eq('chats.product_id', product.id);

      if (queryError) throw queryError;

      let targetChatId: string | null = null;

      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(ec => ec.chat_id);
        const { data: sellerParticipants, error: sellerPartError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .in('chat_id', chatIds)
          .eq('user_id', product.sellers.user_id);

        if (sellerPartError) throw sellerPartError;

        if (sellerParticipants && sellerParticipants.length > 0) {
          targetChatId = sellerParticipants[0].chat_id;
        }
      }

      if (targetChatId) {
        // Reuse existing chat
        router.push(`/chats/${targetChatId}`);
        return;
      }

      // Create new chat (CTO Decision 1: Uniqueness)
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          product_id: product.id,
        })
        .select('id')
        .single();

      if (chatError || !newChat) throw chatError;

      targetChatId = newChat.id;

      // Add participants
      const participantsPayload = [
        { chat_id: targetChatId, user_id: storeUser.id },
        { chat_id: targetChatId, user_id: product.sellers.user_id }
      ];

      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(participantsPayload);

      if (partError) throw partError;

      // Create First System Message (CTO Decision 2: First Message Auto Create)
      const systemMessageContent = `${product.title} mahsuloti bo'yicha suhbat boshlandi.`;
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          chat_id: targetChatId,
          sender_id: null,
          content: systemMessageContent,
        });

      if (msgError) console.error('Failed to create first system message:', msgError.message);

      router.push(`/chats/${targetChatId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Suhbatni boshlashda xatolik yuz berdi.';
      alert(msg);
    } finally {
      setChatLoading(false);
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
        <div className="h-6 bg-slate-800 rounded w-2/3"></div>
        <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        <div className="h-20 bg-slate-800 rounded"></div>
      </div>
    );
  }

  // Access control check (CTO Decision: Product Visibility Rules)
  const isOwner = storeUser && product && product.sellers && product.sellers.user_id === storeUser.id;
  const isAdmin = storeUser && storeUser.role === 'admin';
  const isAuthorized = product && (product.status === 'active' || isOwner || isAdmin);

  if (!product || !isAuthorized) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-slate-400 text-sm">Ushbu mahsulot topilmadi yoki sotuvdan olingan.</p>
        <button
          onClick={() => router.back()}
          className="inline-flex px-4 py-2 bg-slate-850 hover:bg-slate-800 text-emerald-400 rounded-xl text-xs font-semibold border border-slate-700/50 transition duration-150"
        >
          Orqaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition duration-150"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-800/40 px-2.5 py-1 rounded-full border border-slate-700/30">
          {product.subcategories?.categories?.name || 'Mahsulot'}
        </span>
      </div>

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
              Rasm yuklanmadi
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
                  activeImage === img.image_url ? 'border-emerald-400 scale-95' : 'border-slate-700/50 hover:border-slate-600'
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
        
        {/* Title */}
        <h1 className="text-lg font-bold text-slate-100 leading-snug">{product.title}</h1>

        {/* Price tags */}
        <div className="flex items-baseline gap-2.5">
          <div className="text-xl font-bold text-emerald-400">
            {formatPrice(product.price)} <span className="text-xs font-normal text-slate-400">so&apos;m / {product.unit}</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/30 text-xs">
          {/* Region */}
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">{product.regions?.name || 'O\'zbekiston'}</span>
          </div>
          {/* Category */}
          <div className="flex items-center gap-2 text-slate-300">
            <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">{product.subcategories?.name || 'Kategoriya'}</span>
          </div>
          {/* Seller / Store */}
          <div className="flex items-center gap-2 text-slate-300 col-span-2">
            <Store className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate flex items-center gap-1 font-medium">
              {product.sellers?.store_name || 'Agro Seller'}
              {product.sellers?.is_verified && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500/10 shrink-0" />
              )}
            </span>
          </div>
          {/* Created Date */}
          <div className="flex items-center gap-2 text-slate-400 col-span-2">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Joylashtirildi: {formatDate(product.created_at)}</span>
          </div>
        </div>

        {/* Quantity Selector Option */}
        <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sotib olish miqdori</span>
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-1.5 py-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-3.5 text-xs font-bold text-slate-100 min-w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-500 pl-1 pr-1.5">{product.unit}</span>
          </div>
        </div>

        {/* Product Description */}
        <div className="space-y-1.5 pt-3.5 border-t border-slate-700/30">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Batafsil ma&apos;lumot</h2>
          <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          className={`py-3 font-semibold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 active:scale-95 border ${
            addedFeedback 
              ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
              : 'bg-slate-800 hover:bg-slate-750 border-slate-700/50 text-slate-200'
          }`}
          onClick={handleAddToCart}
        >
          {addedFeedback ? (
            <>
              <Check className="w-4 h-4 shrink-0" />
              Savatga qo&apos;shildi!
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 text-emerald-400 shrink-0" />
              Savatga qo&apos;shish
            </>
          )}
        </button>
        <button
          disabled={chatLoading}
          onClick={handleStartChat}
          className="py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-900 font-semibold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-emerald-500/5"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          {chatLoading ? 'Boshlanmoqda...' : 'Bog\'lanish'}
        </button>
      </div>
    </div>
  );
}

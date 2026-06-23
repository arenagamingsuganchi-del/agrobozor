'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { useStorage } from '@/hooks/useStorage';
import { ChevronLeft, ShieldAlert, Upload, X, Check } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Region {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
}

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

interface ProductDetails {
  id: string;
  seller_id: string;
  subcategory_id: string;
  title: string;
  description: string;
  price: number;
  unit: string;
  region_id: string;
  status: 'draft' | 'pending' | 'active' | 'rejected' | 'archived';
  product_images: ProductImage[];
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const { user: storeUser } = useStore();
  const { uploadImages, deleteImage, uploading } = useStorage();

  const [regions, setRegions] = useState<Region[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [sellerId, setSellerId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [regionId, setRegionId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [status, setStatus] = useState<'draft' | 'pending' | 'active' | 'rejected' | 'archived'>('pending');

  // Image Management States
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<{ file: File; previewUrl: string }[]>([]);
  const [deletedImages, setDeletedImages] = useState<ProductImage[]>([]);
  const [primaryImageId, setPrimaryImageId] = useState<string | null>(null);
  const [primaryNewImageIndex, setPrimaryNewImageIndex] = useState<number | null>(null);

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormMetadata() {
      if (!storeUser || !productId) return;
      try {
        setLoading(true);
        // 1. Fetch metadata
        const { data: regData } = await supabase.from('regions').select('id, name').order('name');
        if (regData) setRegions(regData);

        const { data: subData } = await supabase.from('subcategories').select('id, name').order('name');
        if (subData) setSubcategories(subData);

        // 2. Fetch seller profile
        const { data: selData } = await supabase
          .from('sellers')
          .select('id')
          .eq('user_id', storeUser.id)
          .single();

        if (!selData) {
          router.replace('/profile');
          return;
        }
        setSellerId(selData.id);

        // 3. Fetch product details along with images
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select(`
            id, 
            seller_id, 
            subcategory_id, 
            title, 
            description, 
            price, 
            unit, 
            region_id, 
            status,
            product_images (id, image_url, is_primary)
          `)
          .eq('id', productId)
          .single();

        if (prodError || !prodData) {
          setError('Mahsulot topilmadi.');
          return;
        }

        const product = prodData as unknown as ProductDetails;

        // Verify product owner
        if (product.seller_id !== selData.id) {
          router.replace('/seller/dashboard');
          return;
        }

        // Populate fields
        setTitle(product.title);
        setDescription(product.description);
        setPrice(product.price.toString());
        setUnit(product.unit);
        setRegionId(product.region_id);
        setSubcategoryId(product.subcategory_id);
        setStatus(product.status);

        // Populate images
        const imgs = product.product_images || [];
        setExistingImages(imgs);
        
        // Find primary image
        const primaryImg = imgs.find(img => img.is_primary);
        if (primaryImg) {
          setPrimaryImageId(primaryImg.id);
        } else if (imgs.length > 0) {
          setPrimaryImageId(imgs[0].id);
        }

        // Fetch latest rejection reason if status is rejected (CTO Decision 3)
        if (product.status === 'rejected') {
          const { data: logs, error: logsError } = await supabase
            .from('product_moderation_logs')
            .select('reason')
            .eq('product_id', productId)
            .eq('new_status', 'rejected')
            .order('created_at', { ascending: false })
            .limit(1);

          if (logs && logs.length > 0 && !logsError) {
            setRejectionReason(logs[0].reason);
          }
        }

      } catch (err) {
        console.error('Failed to load metadata:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFormMetadata();
  }, [storeUser, productId, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const totalImages = existingImages.length + selectedImages.length + filesArray.length;

      // Validate Max 10 images (CTO Decision 3)
      if (totalImages > 10) {
        alert('Maksimal 10 ta rasm yuklash mumkin.');
        return;
      }

      const newImages = filesArray.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setSelectedImages([...selectedImages, ...newImages]);
    }
  };

  const handleRemoveExistingImage = (img: ProductImage) => {
    setExistingImages(existingImages.filter((x) => x.id !== img.id));
    setDeletedImages([...deletedImages, img]);
    if (primaryImageId === img.id) {
      setPrimaryImageId(null);
    }
  };

  const handleRemoveNewImage = (index: number) => {
    const updated = [...selectedImages];
    URL.revokeObjectURL(updated[index].previewUrl);
    updated.splice(index, 1);
    setSelectedImages(updated);

    if (primaryNewImageIndex === index) {
      setPrimaryNewImageIndex(null);
    } else if (primaryNewImageIndex !== null && primaryNewImageIndex > index) {
      setPrimaryNewImageIndex(primaryNewImageIndex - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent, statusType?: 'draft' | 'pending') => {
    e.preventDefault();
    if (!sellerId || !productId) return;

    // Validations
    if (!title.trim()) return setError('Sarlavha kiritilishi majburiy.');
    if (!description.trim()) return setError('Tavsif kiritilishi majburiy.');
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      return setError('Narx musbat son bo\'lishi majburiy.');
    }
    if (!regionId) return setError('Viloyat tanlanishi majburiy.');
    if (!subcategoryId) return setError('Ost-toifa tanlanishi majburiy.');

    const totalRemaining = existingImages.length + selectedImages.length;
    // Validate Min 1 image (CTO Decision 3)
    if (totalRemaining === 0) {
      return setError('Kamida 1 ta rasm yuklanishi majburiy.');
    }

    setSaving(true);
    setError(null);

    const uploadedPaths: string[] = [];
    const newImageUrls: string[] = [];

    try {
      // 1. Handle deleted images (remove from Supabase storage and product_images table)
      for (const img of deletedImages) {
        const parts = img.image_url.split('/product-images/');
        if (parts.length > 1) {
          const filePath = parts[1];
          await deleteImage(filePath);
        }

        await supabase
          .from('product_images')
          .delete()
          .eq('id', img.id);
      }

      // 2. Upload new images if any
      if (selectedImages.length > 0) {
        const filesToUpload = selectedImages.map((img) => img.file);
        const uploadResults = await uploadImages(filesToUpload, sellerId);
        uploadResults.forEach((res) => {
          uploadedPaths.push(res.filePath);
          newImageUrls.push(res.url);
        });
      }

      // Determine final status
      const finalStatus = statusType || status;

      // 3. Update Product fields
      const { error: updateError } = await supabase
        .from('products')
        .update({
          subcategory_id: subcategoryId,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          unit: unit,
          region_id: regionId,
          status: finalStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }

      // Determine cover selection
      let finalPrimaryId = primaryImageId;
      let finalPrimaryNewIndex = primaryNewImageIndex;

      // Fallback if no primary selected
      if (!finalPrimaryId && finalPrimaryNewIndex === null) {
        if (existingImages.length > 0) {
          finalPrimaryId = existingImages[0].id;
        } else if (newImageUrls.length > 0) {
          finalPrimaryNewIndex = 0;
        }
      }

      // 4. Update existing images database properties (is_primary)
      for (const img of existingImages) {
        const isPrimary = img.id === finalPrimaryId;
        await supabase
          .from('product_images')
          .update({ is_primary: isPrimary })
          .eq('id', img.id);
      }

      // 5. Insert new images into product_images
      if (newImageUrls.length > 0) {
        const imagesPayload = newImageUrls.map((url, idx) => ({
          product_id: productId,
          image_url: url,
          is_primary: idx === finalPrimaryNewIndex,
          sort_order: existingImages.length + idx,
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imagesPayload);

        if (imagesError) {
          // Cleanup newly uploaded images on error
          for (const path of uploadedPaths) {
            await deleteImage(path);
          }
          throw imagesError;
        }
      }

      router.push('/seller/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-40 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/seller/dashboard" 
          className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition duration-150"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-base font-bold text-slate-200">Tahrirlash</h1>
          <p className="text-[10px] text-slate-400">E&apos;lon ma&apos;lumotlarini o&apos;zgartirish</p>
        </div>
      </div>

      {rejectionReason && (
        <div className="p-3.5 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs space-y-1">
          <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-450" />
            Rad etish sababi:
          </span>
          <p className="text-slate-300 font-medium pl-5">{rejectionReason}</p>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-4 text-xs">
        {/* Images Picker (CTO Decision 3: Multi Image) */}
        <div className="space-y-2">
          <label className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            Mahsulot Rasmlari ({existingImages.length + selectedImages.length}/10)
          </label>
          
          <div className="grid grid-cols-4 gap-2.5">
            {/* Existing images from DB */}
            {existingImages.map((img) => (
              <div 
                key={img.id} 
                className={`relative aspect-square rounded-xl overflow-hidden bg-slate-900 border ${
                  primaryImageId === img.id ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-slate-700'
                }`}
              >
                <Image 
                  src={img.image_url} 
                  alt="existing preview" 
                  width={100} 
                  height={100} 
                  className="w-full h-full object-cover" 
                  unoptimized 
                />
                <button
                  type="button"
                  onClick={() => handleRemoveExistingImage(img)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-950/70 border border-slate-700/50 flex items-center justify-center text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
                {/* Cover Select Button */}
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryImageId(img.id);
                    setPrimaryNewImageIndex(null);
                  }}
                  className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5 ${
                    primaryImageId === img.id 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                      : 'bg-slate-950/70 text-slate-400 border-slate-700'
                  }`}
                >
                  {primaryImageId === img.id && <Check className="w-2.5 h-2.5" />}
                  {primaryImageId === img.id ? 'Muqova' : 'Tanlash'}
                </button>
              </div>
            ))}

            {/* New selected images */}
            {selectedImages.map((img, idx) => (
              <div 
                key={idx} 
                className={`relative aspect-square rounded-xl overflow-hidden bg-slate-900 border ${
                  primaryNewImageIndex === idx ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-slate-700'
                }`}
              >
                <Image 
                  src={img.previewUrl} 
                  alt="new preview" 
                  width={100} 
                  height={100} 
                  className="w-full h-full object-cover" 
                  unoptimized 
                />
                <button
                  type="button"
                  onClick={() => handleRemoveNewImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-950/70 border border-slate-700/50 flex items-center justify-center text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
                {/* Cover Select Button */}
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryImageId(null);
                    setPrimaryNewImageIndex(idx);
                  }}
                  className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5 ${
                    primaryNewImageIndex === idx 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                      : 'bg-slate-950/70 text-slate-400 border-slate-700'
                  }`}
                >
                  {primaryNewImageIndex === idx && <Check className="w-2.5 h-2.5" />}
                  {primaryNewImageIndex === idx ? 'Muqova' : 'Tanlash'}
                </button>
              </div>
            ))}

            {existingImages.length + selectedImages.length < 10 && (
              <label className="aspect-square border border-dashed border-slate-700 hover:border-slate-500 rounded-xl flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-slate-400 bg-slate-800/20">
                <Upload className="w-5 h-5 mb-1" />
                <span className="text-[9px]">Yuklash</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium">Mahsulot Sarlavhasi</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Gollandiya bodring urug'i F1"
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Category / Subcategory dropdown */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium">Ost-Toifa</label>
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="">Tanlang...</option>
            {subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>

        {/* Price & Unit Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Narxi (so&apos;m)</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="15000"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">O&apos;lchov Birligi</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="kg">kg</option>
              <option value="dona">dona (dona)</option>
              <option value="tonna">tonna</option>
              <option value="litr">litr</option>
            </select>
          </div>
        </div>

        {/* Region */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium">Viloyat</label>
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="">Tanlang...</option>
            {regions.map((reg) => (
              <option key={reg.id} value={reg.id}>{reg.name}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-medium">Mahsulot Tavsifi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tafsilotlar..."
            rows={4}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
          />
        </div>

        {/* Submit Actions (CTO Decision 2: Status update options) */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <button
            type="button"
            disabled={saving || uploading}
            onClick={(e) => handleSubmit(e, 'draft')}
            className="py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition duration-150 active:scale-95 disabled:opacity-50"
          >
            Qoralama (Draft) qilish
          </button>
          
          <button
            type="button"
            disabled={saving || uploading}
            onClick={(e) => handleSubmit(e, 'pending')}
            className="py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl text-xs transition duration-150 active:scale-95 disabled:opacity-50 shadow-md"
          >
            {saving ? 'Saqlanmoqda...' : 'Tasdiqqa Yuborish'}
          </button>
        </div>
      </form>
    </div>
  );
}

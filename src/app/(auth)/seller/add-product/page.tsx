'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase/client';
import { useStorage } from '@/hooks/useStorage';
import { ChevronLeft, Upload, X, ShieldAlert, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

interface SelectedImage {
  file: File;
  previewUrl: string;
}

export default function AddProductPage() {
  const router = useRouter();
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
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
  
  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormMetadata() {
      if (!storeUser) return;
      try {
        // 1. Fetch regions
        const { data: regData } = await supabase.from('regions').select('id, name').order('name');
        if (regData) setRegions(regData);

        // 2. Fetch subcategories
        const { data: subData } = await supabase.from('subcategories').select('id, name').order('name');
        if (subData) setSubcategories(subData);

        // 3. Fetch seller profile to get seller_id
        const { data: selData } = await supabase
          .from('sellers')
          .select('id')
          .eq('user_id', storeUser.id)
          .single();

        if (selData) {
          setSellerId(selData.id);
        } else {
          router.replace('/profile');
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }

    loadFormMetadata();
  }, [storeUser, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const totalImages = selectedImages.length + filesArray.length;

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

  const handleRemoveImage = (index: number) => {
    const updated = [...selectedImages];
    URL.revokeObjectURL(updated[index].previewUrl);
    updated.splice(index, 1);
    setSelectedImages(updated);

    // Update primary cover index if removed
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(0);
    } else if (primaryImageIndex > index) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent, statusType: 'pending' | 'draft') => {
    e.preventDefault();
    if (!sellerId) return;

    // Validations
    if (!title.trim()) return setError('Sarlavha kiritilishi majburiy.');
    if (!description.trim()) return setError('Tavsif kiritilishi majburiy.');
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      return setError('Narx musbat son bo\'lishi majburiy.');
    }
    if (!regionId) return setError('Viloyat tanlanishi majburiy.');
    if (!subcategoryId) return setError('Ost-toifa tanlanishi majburiy.');
    
    // Validate Min 1 image (CTO Decision 3)
    if (selectedImages.length === 0) {
      return setError('Kamida 1 ta rasm yuklanishi majburiy.');
    }

    setLoading(true);
    setError(null);

    const uploadedPaths: string[] = [];

    try {
      // 1. Upload Images to Supabase Storage
      const filesToUpload = selectedImages.map((img) => img.file);
      const uploadResults = await uploadImages(filesToUpload, sellerId);
      uploadResults.forEach((res) => uploadedPaths.push(res.filePath));

      // 2. Insert Product Row
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          seller_id: sellerId,
          subcategory_id: subcategoryId,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          unit: unit,
          region_id: regionId,
          status: statusType, // CTO Decision 2 (draft or pending)
          stock: 100, // Default stock
        })
        .select()
        .single();

      if (productError || !newProduct) {
        throw productError || new Error('Mahsulotni saqlashda xatolik.');
      }

      // 3. Insert Product Images rows (CTO Decision 3: Cover Image concept)
      const imagesPayload = uploadResults.map((res, index) => ({
        product_id: newProduct.id,
        image_url: res.url,
        is_primary: index === primaryImageIndex, // Set cover image
        sort_order: index,
      }));

      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imagesPayload);

      if (imagesError) {
        // Cleanup storage on error
        for (const path of uploadedPaths) {
          await deleteImage(path);
        }
        throw imagesError;
      }

      // Success
      router.push('/seller/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xatolik yuz berdi.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-base font-bold text-slate-200">E&apos;lon Qo&apos;shish</h1>
          <p className="text-[10px] text-slate-400">Yangi mahsulotni tizimga joylash</p>
        </div>
      </div>

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
            Mahsulot Rasmlari ({selectedImages.length}/10)
          </label>
          
          <div className="grid grid-cols-4 gap-2.5">
            {selectedImages.map((img, idx) => (
              <div 
                key={idx} 
                className={`relative aspect-square rounded-xl overflow-hidden bg-slate-900 border ${
                  idx === primaryImageIndex ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-slate-700'
                }`}
              >
                <Image 
                  src={img.previewUrl} 
                  alt="preview" 
                  width={100} 
                  height={100} 
                  className="w-full h-full object-cover" 
                  unoptimized 
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-950/70 border border-slate-700/50 flex items-center justify-center text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
                {/* Cover Select Button */}
                <button
                  type="button"
                  onClick={() => setPrimaryImageIndex(idx)}
                  className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5 ${
                    idx === primaryImageIndex 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                      : 'bg-slate-950/70 text-slate-400 border-slate-700'
                  }`}
                >
                  {idx === primaryImageIndex && <Check className="w-2.5 h-2.5" />}
                  {idx === primaryImageIndex ? 'Muqova' : 'Tanlash'}
                </button>
              </div>
            ))}

            {selectedImages.length < 10 && (
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
            placeholder="Masalan: Gollandiya bodring urug'i F1"
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
              placeholder="Masalan: 15000"
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
            placeholder="Mahsulot turi, xususiyatlari, hosildorligi va yetkazish shartlari haqida batafsil ma'lumot bering..."
            rows={4}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
          />
        </div>

        {/* Submit Actions (CTO Decision 2: Draft mode support) */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <button
            type="button"
            disabled={loading || uploading}
            onClick={(e) => handleSubmit(e, 'draft')}
            className="py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition duration-150 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Kutilmoqda...' : 'Qoralama (Draft)'}
          </button>
          
          <button
            type="button"
            disabled={loading || uploading}
            onClick={(e) => handleSubmit(e, 'pending')}
            className="py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl text-xs transition duration-150 active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-500/5"
          >
            {loading ? 'Yuklanmoqda...' : 'Tasdiqqa Yuborish'}
          </button>
        </div>
      </form>
    </div>
  );
}

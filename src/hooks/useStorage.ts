'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface UploadResult {
  url: string;
  filePath: string;
}

export function useStorage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImages = async (
    files: File[], 
    sellerId: string
  ): Promise<UploadResult[]> => {
    if (files.length === 0) {
      throw new Error('Kamida 1 ta rasm yuklash shart.');
    }
    if (files.length > 10) {
      throw new Error('Ko\'pi bilan 10 ta rasm yuklash mumkin.');
    }

    setUploading(true);
    setError(null);
    const results: UploadResult[] = [];

    try {
      for (const file of files) {
        // 1. File Size Validation (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" rasmi juda katta. Maksimal hajmi 5MB bo'lishi kerak.`);
        }

        // 2. File Type Validation (JPG, PNG, WEBP only)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`"${file.name}" rasm formati noto'g'ri. Faqat JPG, PNG yoki WEBP formatlari qabul qilinadi.`);
        }

        // 3. Construct File Path
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `products/${sellerId}/${fileName}`;

        // 4. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // 5. Retrieve Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        results.push({
          url: publicUrl,
          filePath: filePath,
        });
      }

      return results;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Rasmni yuklashda xatolik yuz berdi.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (filePath: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase.storage
        .from('product-images')
        .remove([filePath]);
      if (deleteError) throw deleteError;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown delete error';
      console.error('Failed to delete storage image:', message);
    }
  };

  return {
    uploadImages,
    deleteImage,
    uploading,
    error,
  };
}

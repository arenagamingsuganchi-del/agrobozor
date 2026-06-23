'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchBar } from '@/components/shared/search-bar';
import { ProductCard } from '@/components/shared/product-card';
import { supabase } from '@/lib/supabase/client';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  title: string;
  price: number;
  unit: string;
  regions: { id: string; name: string } | null;
  product_images: { image_url: string }[];
}

function ProductsListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse filters from URL
  const queryParam = searchParams.get('search') || '';
  const categoryIdParam = searchParams.get('category_id') || '';
  const subcategoryIdParam = searchParams.get('subcategory_id') || '';
  const regionIdParam = searchParams.get('region_id') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFilteredProducts() {
      try {
        setLoading(true);

        // Build base query
        let queryBuilder = supabase
          .from('products')
          .select(`
            id,
            title,
            price,
            unit,
            regions (id, name),
            subcategories!inner (
              id,
              name,
              category_id
            ),
            product_images (image_url)
          `)
          .eq('status', 'active');

        // Apply Search Text Filter (checks both title and description)
        if (queryParam) {
          queryBuilder = queryBuilder.or(`title.ilike.%${queryParam}%,description.ilike.%${queryParam}%`);
        }

        // Apply Subcategory Filter
        if (subcategoryIdParam) {
          queryBuilder = queryBuilder.eq('subcategory_id', subcategoryIdParam);
        }

        // Apply Category Filter (joins via subcategory inner join)
        if (categoryIdParam) {
          queryBuilder = queryBuilder.eq('subcategories.category_id', categoryIdParam);
        }

        // Apply Region Filter
        if (regionIdParam) {
          queryBuilder = queryBuilder.eq('region_id', regionIdParam);
        }

        // Order by newest
        queryBuilder = queryBuilder.order('created_at', { ascending: false });

        const { data, error } = await queryBuilder;

        if (data && !error) {
          setProducts(data as unknown as Product[]);
        } else if (error) {
          console.error('Error loading filtered products:', error.message);
        }
      } catch (err) {
        console.error('Unexpected error during filtering:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFilteredProducts();
  }, [queryParam, categoryIdParam, subcategoryIdParam, regionIdParam]);

  // Handle updates to search text input
  const handleSearchChange = (val: string) => {
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set('search', val);
    } else {
      params.delete('search');
    }
    router.push(`/products?${params.toString()}`);
  };

  // Handle updates to region selector
  const handleRegionChange = (val: string) => {
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set('region_id', val);
    } else {
      params.delete('region_id');
    }
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="space-y-5 w-full">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <Link 
          href="/home" 
          className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition duration-150"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-base font-bold text-slate-200">Mahsulotlar</h1>
          <p className="text-[10px] text-slate-400">Qidiruv natijalari va filtrlar</p>
        </div>
      </div>

      {/* Filter inputs */}
      <SearchBar
        onSearchChange={handleSearchChange}
        onRegionChange={handleRegionChange}
        initialQuery={queryParam}
        initialRegionId={regionIdParam}
      />

      {/* Products list feed */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3.5">
          {[1, 2, 4, 6].map((i) => (
            <div key={i} className="aspect-square bg-slate-800/40 border border-slate-700/50 rounded-2xl animate-pulse flex flex-col p-4 justify-end space-y-2">
              <div className="h-4 bg-slate-700/50 rounded w-2/3"></div>
              <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6">
          <p className="text-sm text-slate-400">Kechirasiz, mos keluvchi mahsulotlar topilmadi.</p>
          <Link
            href="/products"
            className="inline-flex px-4 py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 rounded-xl text-xs font-semibold border border-slate-700/50 transition duration-150"
          >
            Filtrlarni tozalash
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {products.map((prod) => (
            <ProductCard
              key={prod.id}
              id={prod.id}
              title={prod.title}
              price={prod.price}
              unit={prod.unit}
              regionName={prod.regions?.name || 'O\'zbekiston'}
              imageUrl={prod.product_images?.[0]?.image_url}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Sahifa tayyorlanmoqda...
      </div>
    }>
      <ProductsListContent />
    </Suspense>
  );
}

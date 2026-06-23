'use client';

import React, { useEffect, useState } from 'react';
import { useRouter as useNextRouter } from 'next/navigation';
import { SearchBar } from '@/components/shared/search-bar';
import { ProductCard } from '@/components/shared/product-card';
import { supabase } from '@/lib/supabase/client';
import { Sprout, Trees, ShieldAlert, Award, Tractor } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  title: string;
  price: number;
  unit: string;
  regions: { name: string } | null;
  product_images: { image_url: string }[];
}

export default function HomePage() {
  const router = useNextRouter();
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLatestProducts() {
      try {
        setLoading(true);
        // Fetch active products with their primary image and region
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            title,
            price,
            unit,
            regions (name),
            product_images (image_url)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8);

        if (data && !error) {
          setLatestProducts(data as unknown as Product[]);
        } else if (error) {
          console.error('Error loading latest products:', error.message);
        }
      } catch (err) {
        console.error('Unexpected error loading products:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLatestProducts();
  }, []);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  const handleRegionSelect = (regionId: string) => {
    if (regionId) {
      router.push(`/products?region_id=${regionId}`);
    }
  };

  // Static Categories Mapping (Uzum style icons)
  const categoriesList = [
    { id: 'c1000000-0000-0000-0000-000000000000', name: 'Urug\'lar', icon: Sprout, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { id: 'c2000000-0000-0000-0000-000000000000', name: 'Ko\'chatlar', icon: Trees, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
    { id: 'c3000000-0000-0000-0000-000000000000', name: 'O\'g\'itlar', icon: Award, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { id: 'c4000000-0000-0000-0000-000000000000', name: 'Himoya', icon: ShieldAlert, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    { id: 'c5000000-0000-0000-0000-000000000000', name: 'Xizmatlar', icon: Tractor, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Top Header Block */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-emerald-400">AgroBozor</h1>
        <p className="text-xs text-slate-400">Fermerlar va dehqonlar bozori</p>
      </div>

      {/* Interactive Search Section */}
      <SearchBar 
        onSearchChange={handleSearch} 
        onRegionChange={handleRegionSelect} 
      />

      {/* Categories Horizontal Grid */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold tracking-wide text-slate-300">Kategoriyalar</h2>
          <Link href="/categories" className="text-xs text-emerald-400 hover:text-emerald-300">
            Barchasi &gt;
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {categoriesList.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link 
                key={cat.id} 
                href={`/products?category_id=${cat.id}`}
                className="flex flex-col items-center text-center space-y-1.5 group"
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition duration-150 group-hover:scale-105 ${cat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-medium truncate w-full">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Latest Products Feed */}
      <div className="space-y-3.5">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300">Yangi e&apos;lonlar</h2>
        
        {loading ? (
          <div className="grid grid-cols-2 gap-3.5">
            {[1, 2, 4, 6].map((i) => (
              <div key={i} className="aspect-square bg-slate-800/40 border border-slate-700/50 rounded-2xl animate-pulse flex flex-col p-4 justify-end space-y-2">
                <div className="h-4 bg-slate-700/50 rounded w-2/3"></div>
                <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : latestProducts.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/20 rounded-2xl border border-slate-700/30 text-slate-500 text-sm">
            E&apos;lonlar topilmadi.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {latestProducts.map((prod) => (
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
    </div>
  );
}

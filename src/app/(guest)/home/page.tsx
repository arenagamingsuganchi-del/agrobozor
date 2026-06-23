/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchBar } from '@/components/shared/search-bar';
import { ProductCard } from '@/components/shared/product-card';
import { supabase } from '@/lib/supabase/client';
import { useStore } from '@/store';
import { Tractor, MapPin, MessageSquare, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  title: string;
  price: number;
  unit: string;
  regions: { id: string; name: string } | null;
  product_images: { image_url: string }[];
}

interface Region {
  id: string;
  name: string;
}

interface Seller {
  id: string;
  store_name: string;
  is_verified: boolean;
  avatar_url?: string;
}

export default function HomePage() {
  const router = useRouter();
  const { user: storeUser } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [verifiedSellers, setVerifiedSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch verified sellers
  useEffect(() => {
    async function loadSellers() {
      const { data } = await supabase
        .from('sellers')
        .select('id, store_name, is_verified')
        .eq('is_verified', true)
        .limit(6);
      if (data) {
        // Add random high quality farm avatars
        const avatars = [
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100',
          'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=100',
        ];
        setVerifiedSellers(data.map((s, idx) => ({
          ...s,
          avatar_url: avatars[idx % avatars.length],
        })));
      }
    }
    loadSellers();
  }, []);

  // Fetch regions
  useEffect(() => {
    async function loadRegions() {
      const { data } = await supabase
        .from('regions')
        .select('id, name')
        .order('name', { ascending: true });
      if (data) {
        setRegions(data);
      }
    }
    loadRegions();
  }, []);

  // Fetch active products
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        let query = supabase
          .from('products')
          .select(`
            id,
            title,
            price,
            unit,
            regions (id, name),
            product_images (image_url)
          `)
          .eq('status', 'active');

        if (selectedRegionId) {
          query = query.eq('region_id', selectedRegionId);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(20);

        if (data && !error) {
          setProducts(data as unknown as Product[]);
        }
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [selectedRegionId]);

  // Fetch unread messages count
  useEffect(() => {
    if (!storeUser) {
      setUnreadCount(0);
      return;
    }

    const currentUserId = storeUser.id;

    async function getUnreadCount() {
      try {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('chat_id, last_read_at')
          .eq('user_id', currentUserId);

        if (!participants) return;

        const countPromises = participants.map(async (p) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', p.chat_id)
            .eq('is_deleted', false)
            .gt('created_at', p.last_read_at)
            .neq('sender_id', currentUserId);
          return count || 0;
        });

        const counts = await Promise.all(countPromises);
        setUnreadCount(counts.reduce((acc, c) => acc + c, 0));
      } catch {}
    }

    getUnreadCount();

    // Set up subscription
    const channel = supabase
      .channel('home_unread_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        getUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeUser]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
  };

  // Filter products locally for search query
  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRegionName = regions.find(r => r.id === selectedRegionId)?.name || '';

  // Separate New Arrivals (first 6 items) and Recommended (rest)
  const newArrivals = filteredProducts.slice(0, 6);
  const recommended = filteredProducts.slice(2);

  return (
    <div className="space-y-4 pb-20 w-full relative">
      
      {/* Header Row */}
      <div className="flex items-center justify-between py-1 bg-transparent">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Tractor className="w-6 h-6 text-emerald-755 stroke-[2.2]" />
          <span className="text-lg font-black text-emerald-800 tracking-tight">AgroBozor</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Location Pin */}
          <button 
            onClick={() => setIsRegionModalOpen(true)}
            className={`p-2 rounded-full relative transition border duration-150 cursor-pointer ${
              selectedRegionId 
                ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                : 'bg-white border-slate-100 text-slate-650'
            }`}
          >
            <MapPin className="w-5 h-5 stroke-[2]" />
            {selectedRegionId && (
              <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[7px] px-1 rounded-full font-bold">
                {selectedRegionName.substring(0, 3)}
              </span>
            )}
          </button>

          {/* Chat Icon */}
          <Link 
            href={storeUser ? "/chats" : "/profile"}
            className="p-2 rounded-full relative bg-white border border-slate-100 text-slate-600 transition duration-150 hover:bg-slate-50"
          >
            <MessageSquare className="w-5 h-5 stroke-[2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <SearchBar 
        onSearchChange={handleSearch}
        onRegionChange={handleRegionChange}
        initialRegionId={selectedRegionId}
        showFilter={true}
        placeholder="Search seeds, tractors, tools..."
      />

      {/* Special Offer Banner */}
      <div className="w-full relative rounded-2xl overflow-hidden aspect-[2.2/1] bg-emerald-950 shadow-sm border border-slate-100">
        <Image 
          src="https://images.unsplash.com/photo-1500937386664-56d15943747d?auto=format&fit=crop&q=80&w=600"
          alt="Modern tractor banner"
          fill
          className="object-cover opacity-75"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-transparent p-4 flex flex-col justify-between">
          <span className="self-start px-2 py-0.5 bg-emerald-600 text-white text-[8px] font-bold rounded uppercase tracking-wider">
            Special Offer
          </span>
          <div className="space-y-1 max-w-[65%]">
            <h2 className="text-white text-xs font-bold leading-tight md:text-sm">
              Modern Equipment for Better Yields
            </h2>
            <Link 
              href="/products?category_id=c5000000-0000-0000-0000-000000000000"
              className="inline-flex px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-lg transition active:scale-95 shadow-sm"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">New Arrivals</h2>
            <Link href="/products" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800">
              View All
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-none snap-x">
            {newArrivals.map((prod) => (
              <div key={prod.id} className="w-36 shrink-0 snap-start">
                <ProductCard
                  id={prod.id}
                  title={prod.title}
                  price={prod.price}
                  unit={prod.unit}
                  regionName={prod.regions?.name.replace(' vil.', '') || 'Uzbekistan'}
                  imageUrl={prod.product_images?.[0]?.image_url}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Sellers */}
      {verifiedSellers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Verified Sellers</h2>
          
          <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-none">
            {verifiedSellers.map((seller) => (
              <Link 
                key={seller.id}
                href={`/products?seller_id=${seller.id}`}
                className="flex flex-col items-center space-y-1 shrink-0 group text-center"
              >
                <div className="relative w-12 h-12 rounded-full border border-slate-100 overflow-hidden shadow-sm group-hover:border-emerald-600 transition">
                  <Image 
                    src={seller.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} 
                    alt={seller.store_name} 
                    fill 
                    className="object-cover"
                    unoptimized
                  />
                  {/* Verified Check Badge */}
                  <span className="absolute bottom-0 right-0 bg-emerald-650 border border-white text-white p-0.5 rounded-full flex items-center justify-center">
                    <Check className="w-2 h-2 stroke-[4]" />
                  </span>
                </div>
                <span className="text-[9px] font-semibold text-slate-700 truncate w-14 leading-tight">
                  {seller.store_name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Grid */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight">Recommended for You</h2>
        
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[0.8] bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
            Mahsulotlar topilmadi.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recommended.length > 0 ? (
              recommended.map((prod) => (
                <ProductCard
                  key={prod.id}
                  id={prod.id}
                  title={prod.title}
                  price={prod.price}
                  unit={prod.unit}
                  regionName={prod.regions?.name.replace(' vil.', '') || 'Uzbekistan'}
                  imageUrl={prod.product_images?.[0]?.image_url}
                />
              ))
            ) : (
              filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  id={prod.id}
                  title={prod.title}
                  price={prod.price}
                  unit={prod.unit}
                  regionName={prod.regions?.name.replace(' vil.', '') || 'Uzbekistan'}
                  imageUrl={prod.product_images?.[0]?.image_url}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => {
          if (!storeUser) {
            router.push('/profile');
          } else {
            router.push('/seller/dashboard');
          }
        }}
        className="fixed right-4 bottom-20 w-11 h-11 bg-emerald-800 hover:bg-emerald-950 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition active:scale-95 z-40"
        title="Yangi e'lon qo'shish"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Region Picker Modal */}
      {isRegionModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[70vh] flex flex-col space-y-4 shadow-xl border border-slate-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-700" />
                Hududni tanlang
              </h3>
              <button 
                onClick={() => setIsRegionModalOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-655 cursor-pointer"
              >
                Yopish
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
              <button
                onClick={() => {
                  setSelectedRegionId('');
                  setIsRegionModalOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex justify-between items-center transition ${
                  selectedRegionId === '' 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Barchasi (O&apos;zbekiston)</span>
                {selectedRegionId === '' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
              
              {regions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRegionId(r.id);
                    setIsRegionModalOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex justify-between items-center transition ${
                    selectedRegionId === r.id 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{r.name}</span>
                  {selectedRegionId === r.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

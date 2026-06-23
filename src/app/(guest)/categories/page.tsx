'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { SearchBar } from '@/components/shared/search-bar';
import { 
  ChevronRight, Sprout, Trees, Award, ShieldAlert, Tractor, Folder, 
  MapPin, MessageSquare, ShieldCheck
} from 'lucide-react';
import { useStore } from '@/store';
import Image from 'next/image';

interface Subcategory {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

export default function CategoriesPage() {
  const { user: storeUser } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select(`
            id,
            name,
            subcategories (
              id,
              name
            )
          `)
          .order('sort_order', { ascending: true });

        if (data && !error) {
          setCategories(data as unknown as Category[]);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  // Fetch unread count for header
  useEffect(() => {
    if (!storeUser) return;
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
  }, [storeUser]);

  const getCategoryDetails = (name: string) => {
    switch (name) {
      case "Urug'lar": 
        return {
          desc: "High-yield grain and vegetable seeds",
          icon: Sprout,
          color: "bg-emerald-50 text-emerald-700 border-emerald-100"
        };
      case "Ko'chatlar": 
        return {
          desc: "Healthy saplings and decorative plants",
          icon: Trees,
          color: "bg-teal-50 text-teal-700 border-teal-100"
        };
      case "O'g'itlar": 
        return {
          desc: "Organic and mineral crop nutrition",
          icon: Award,
          color: "bg-amber-50 text-amber-700 border-amber-100"
        };
      case "Himoya vositalari": 
        return {
          desc: "Pesticides and protective solutions",
          icon: ShieldAlert,
          color: "bg-rose-50 text-rose-700 border-rose-100"
        };
      case "Agro xizmatlar": 
        return {
          desc: "Agro machinery rental and consulting services",
          icon: Tractor,
          color: "bg-sky-50 text-sky-700 border-sky-100"
        };
      default: 
        return {
          desc: "Miscellaneous agricultural products",
          icon: Folder,
          color: "bg-slate-50 text-slate-700 border-slate-100"
        };
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subcategories?.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 pb-20 w-full">
      {/* Header Row */}
      <div className="flex items-center justify-between py-1 bg-transparent">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Tractor className="w-6 h-6 text-emerald-700 stroke-[2.2]" />
          <span className="text-lg font-black text-emerald-800 tracking-tight">AgroBozor</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link 
            href="/home"
            className="p-2 rounded-full bg-white border border-slate-100 text-slate-655 transition duration-150"
          >
            <MapPin className="w-5 h-5 stroke-[2]" />
          </Link>
          <Link 
            href={storeUser ? "/chats" : "/profile"}
            className="p-2 rounded-full relative bg-white border border-slate-100 text-slate-600 transition duration-150"
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

      {/* Search Categories */}
      <SearchBar 
        onSearchChange={setSearchQuery}
        onRegionChange={() => {}}
        showFilter={false}
        placeholder="Search categories..."
      />

      {/* Seasonal Banner */}
      <div className="w-full relative rounded-2xl overflow-hidden aspect-[2.4/1] bg-emerald-950 shadow-sm border border-slate-100">
        <Image 
          src="https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=600"
          alt="Seasonal seeds"
          fill
          className="object-cover opacity-80"
          unoptimized
        />
        <div className="absolute inset-0 bg-emerald-950/20 p-4 flex flex-col justify-end">
          <div className="space-y-0.5 text-white">
            <h2 className="text-sm font-black leading-tight">Seasonal Seeds</h2>
            <p className="text-[10px] text-slate-100 font-medium">Premium quality for your next harvest.</p>
          </div>
        </div>
      </div>

      {/* Browse by Category Card */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">Browse by Category</h3>
        
        {loading ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 animate-pulse"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-1/3 animate-pulse"></div>
                  <div className="h-2.5 bg-slate-50 rounded w-2/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-450 text-xs">
            Kategoriyalar topilmadi.
          </div>
        ) : (
          <div className="bg-white border border-slate-100/80 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden">
            {filteredCategories.map((cat) => {
              const { desc, icon: Icon, color } = getCategoryDetails(cat.name);
              return (
                <div key={cat.id} className="group">
                  <Link
                    href={`/products?category_id=${cat.id}`}
                    className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition duration-150 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${color}`}>
                        <Icon className="w-5.5 h-5.5 stroke-[1.8]" />
                      </div>
                      
                      {/* Info */}
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 text-xs truncate">{cat.name}</span>
                        <span className="text-[10px] text-slate-450 truncate font-medium">{desc}</span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-emerald-700 transition" />
                  </Link>

                  {/* Subcategories preview on hover/focus - elegant drawer */}
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="px-14 pb-3 bg-slate-50/30 flex flex-wrap gap-1.5">
                      {cat.subcategories.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/products?subcategory_id=${sub.id}`}
                          className="px-2 py-0.5 bg-white border border-slate-100 hover:border-emerald-600 rounded text-[9px] font-semibold text-slate-600 hover:text-emerald-750 transition"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verified Sellers Orange Banner */}
      <div className="p-3 bg-amber-50/70 border border-amber-100/70 rounded-2xl flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-amber-600/10 text-amber-700 border border-amber-200/50 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5.5 h-5.5 fill-amber-50" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-amber-900 leading-tight">Verified Sellers Only</span>
          <span className="text-[10px] text-amber-755 font-medium leading-normal">Shop with 100% transaction security.</span>
        </div>
      </div>

    </div>
  );
}

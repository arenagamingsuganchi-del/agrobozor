'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { ChevronRight, Sprout, Trees, ShieldAlert, Award, Tractor, Folder } from 'lucide-react';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
        } else if (error) {
          console.error('Error loading categories:', error.message);
        }
      } catch (err) {
        console.error('Unexpected error loading categories:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  // Icon matcher based on category IDs or name
  const getCategoryIcon = (name: string) => {
    switch (name) {
      case 'Urug\'lar': return Sprout;
      case 'Ko\'chatlar': return Trees;
      case "O'g'itlar": return Award;
      case 'Himoya vositalari': return ShieldAlert;
      case 'Agro xizmatlar': return Tractor;
      default: return Folder;
    }
  };

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-emerald-400">Kategoriyalar</h1>
        <p className="text-xs text-slate-400">Toifalar va ost-toifalar bo&apos;yicha qidirish</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-slate-800/40 border border-slate-700/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.name);
            return (
              <div 
                key={cat.id} 
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden"
              >
                {/* Category Header Row */}
                <Link
                  href={`/products?category_id=${cat.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-850/50 transition duration-150 border-b border-slate-700/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-200 text-sm">{cat.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </Link>

                {/* Subcategories list */}
                <div className="px-4 py-2.5 bg-slate-900/40 grid grid-cols-1 gap-2">
                  {cat.subcategories && cat.subcategories.length > 0 ? (
                    cat.subcategories.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/products?subcategory_id=${sub.id}`}
                        className="py-1.5 text-slate-400 hover:text-emerald-400 transition duration-150 text-xs flex items-center justify-between"
                      >
                        <span>{sub.name}</span>
                        <span className="text-[10px] text-slate-600 font-mono">Batafsil &rarr;</span>
                      </Link>
                    ))
                  ) : (
                    <div className="text-slate-600 text-xs py-1">Ost-kategoriyalar topilmadi.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

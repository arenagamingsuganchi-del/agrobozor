'use client';

import React, { useEffect, useState } from 'react';
import { Search, MapPin, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export interface SearchBarProps {
  onSearchChange: (val: string) => void;
  onRegionChange: (regionId: string) => void;
  initialQuery?: string;
  initialRegionId?: string;
  placeholder?: string;
  showFilter?: boolean;
}

interface Region {
  id: string;
  name: string;
}

export function SearchBar({ 
  onSearchChange, 
  onRegionChange, 
  initialQuery = '', 
  initialRegionId = '',
  placeholder = "Qidirish...",
  showFilter = false 
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState(initialRegionId);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    async function loadRegions() {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name')
        .order('name', { ascending: true });
      if (data && !error) {
        setRegions(data);
      }
    }
    loadRegions();
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onSearchChange(val);
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedRegion(val);
    onRegionChange(val);
  };

  return (
    <div className="w-full space-y-2">
      {/* Search Input Bar */}
      <div className="flex gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition duration-150 shadow-sm"
          />
        </div>

        {showFilter && (
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-2.5 rounded-xl flex items-center justify-center transition duration-150 cursor-pointer shadow-sm border ${
              isFilterOpen 
                ? 'bg-emerald-800 text-white border-emerald-800' 
                : 'bg-emerald-650 text-white border-emerald-650 hover:bg-emerald-700'
            }`}
          >
            <SlidersHorizontal className="w-5.5 h-5.5" />
          </button>
        )}
      </div>

      {/* Slide down Region Selector */}
      {showFilter && isFilterOpen && (
        <div className="relative bg-white border border-slate-150 rounded-xl p-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 mb-1.5">
            <MapPin className="w-4 h-4 text-emerald-650 shrink-0" />
            <span className="text-[11px] font-bold text-slate-700">Hududni filtrlash</span>
          </div>
          
          <select
            value={selectedRegion}
            onChange={handleRegionChange}
            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">Barcha hududlar (O&apos;zbekiston)</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
          <div className="absolute right-6 bottom-5 pointer-events-none text-slate-400 text-[10px]">
            ▼
          </div>
        </div>
      )}
    </div>
  );
}

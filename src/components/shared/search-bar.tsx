'use client';

import React, { useEffect, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export interface SearchBarProps {
  onSearchChange: (val: string) => void;
  onRegionChange: (regionId: string) => void;
  initialQuery?: string;
  initialRegionId?: string;
}

interface Region {
  id: string;
  name: string;
}

export function SearchBar({ onSearchChange, onRegionChange, initialQuery = '', initialRegionId = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState(initialRegionId);

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
    <div className="w-full space-y-2.5">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Mahsulot yoki xizmatlarni qidirish..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500/80 transition duration-150"
        />
      </div>

      {/* Region Selector Bar */}
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
        <select
          value={selectedRegion}
          onChange={handleRegionChange}
          className="w-full pl-10 pr-8 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-100 text-xs appearance-none focus:outline-none focus:border-emerald-500/80 transition duration-150 cursor-pointer"
        >
          <option value="">Barcha hududlar (O&apos;zbekiston)</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
          ▼
        </div>
      </div>
    </div>
  );
}

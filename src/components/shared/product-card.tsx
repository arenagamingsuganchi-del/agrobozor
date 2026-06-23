'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

export interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  unit: string;
  regionName: string;
  imageUrl?: string;
}

export function ProductCard({ id, title, price, unit, regionName, imageUrl }: ProductCardProps) {
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val);
  };

  const fallbackImage = 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=400';

  return (
    <Link 
      href={`/product/${id}`}
      className="group block bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition duration-200"
    >
      <div className="relative aspect-square w-full bg-slate-900 overflow-hidden">
        <Image
          src={imageUrl || fallbackImage}
          alt={title}
          width={200}
          height={200}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          unoptimized
        />
      </div>

      {/* Product Details Area */}
      <div className="p-3.5 space-y-2">
        {/* Price & Unit */}
        <div className="text-emerald-400 font-bold text-base leading-tight">
          {formatPrice(price)} <span className="text-[10px] text-slate-400 font-normal">so&apos;m / {unit}</span>
        </div>

        {/* Product Title */}
        <h3 className="text-slate-200 text-sm font-medium leading-snug line-clamp-2 h-10 group-hover:text-emerald-300 transition duration-150">
          {title}
        </h3>

        {/* Region / Geolocation */}
        <div className="flex items-center text-slate-400 text-xs gap-1 pt-1 border-t border-slate-700/30">
          <MapPin className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
          <span className="truncate">{regionName}</span>
        </div>
      </div>
    </Link>
  );
}

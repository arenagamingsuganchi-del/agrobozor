'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ClipboardList, Sprout, ShieldAlert, Users, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    pendingProducts: 0,
    activeProducts: 0,
    rejectedProducts: 0,
    totalSellers: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminStats() {
      try {
        setLoading(true);

        // Fetch exact counts from DB (using head: true to only get count without records payload)
        const [
          { count: pendingCount },
          { count: activeCount },
          { count: rejectedCount },
          { count: sellersCount },
          { count: ordersCount },
        ] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
          supabase.from('sellers').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('*', { count: 'exact', head: true }),
        ]);

        setStats({
          pendingProducts: pendingCount || 0,
          activeProducts: activeCount || 0,
          rejectedProducts: rejectedCount || 0,
          totalSellers: sellersCount || 0,
          totalOrders: ordersCount || 0,
        });
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="grid grid-cols-2 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Kutilayotgan e\'lonlar',
      value: stats.pendingProducts,
      desc: 'Moderatsiya navbatida',
      color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
      icon: ClipboardList,
      href: '/admin/moderation',
    },
    {
      title: 'Faol mahsulotlar',
      value: stats.activeProducts,
      desc: 'Katalogda faol sotuvda',
      color: 'text-emerald-450 border-emerald-500/20 bg-emerald-500/5',
      icon: Sprout,
      href: '/products',
    },
    {
      title: 'Rad etilganlar',
      value: stats.rejectedProducts,
      desc: 'Qayta tahrirlanishi kutilmoqda',
      color: 'text-red-400 border-red-500/20 bg-red-500/5',
      icon: ShieldAlert,
    },
    {
      title: 'Jami sotuvchilar',
      value: stats.totalSellers,
      desc: 'Tizimda ro\'yxatdan o\'tgan',
      color: 'text-teal-400 border-teal-500/20 bg-teal-500/5',
      icon: Users,
      href: '/admin/sellers',
    },
    {
      title: 'Jami buyurtmalar',
      value: stats.totalOrders,
      desc: 'Tranzaksiyalar tarixi',
      color: 'text-sky-400 border-sky-500/20 bg-sky-500/5',
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="space-y-5 w-full text-xs">
      <div className="flex flex-col space-y-0.5">
        <h2 className="text-sm font-bold text-slate-100">Statistika va Tahlil</h2>
        <p className="text-[10px] text-slate-400">Platforma umumiy ko&apos;rsatkichlari</p>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-2 gap-3.5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const CardContent = (
            <div className={`p-4 border rounded-2xl space-y-2 shadow-sm transition duration-150 h-full ${card.color} ${card.href ? 'hover:shadow active:scale-98 cursor-pointer' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
                <Icon className="w-4 h-4 shrink-0 opacity-80" />
              </div>
              <div>
                <span className="text-xl font-bold text-slate-100 block leading-tight">{card.value}</span>
                <span className="text-[9px] text-slate-500 font-medium block mt-1">{card.desc}</span>
              </div>
            </div>
          );

          if (card.href) {
            return (
              <Link key={idx} href={card.href} className="block h-full">
                {CardContent}
              </Link>
            );
          }

          return <div key={idx}>{CardContent}</div>;
        })}
      </div>

      {/* Moderation Banner Info */}
      {stats.pendingProducts > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex justify-between items-center shadow-md">
          <div className="space-y-0.5">
            <span className="font-bold text-amber-400 block text-xs">Moderatsiya kutayotgan mahsulotlar</span>
            <span className="text-[10px] text-slate-450 leading-relaxed block">Navbatda {stats.pendingProducts} ta mahsulot ko&apos;rib chiqilishi shart.</span>
          </div>
          <Link
            href="/admin/moderation"
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-[10px] flex items-center gap-1 active:scale-95 transition"
          >
            Tekshirish
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

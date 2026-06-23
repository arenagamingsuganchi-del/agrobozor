'use client';

import React from 'react';
import { useStore } from '@/store';
import { ShieldCheck, ShieldAlert, BarChart3, ClipboardList, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user: storeUser, isLoading } = useStore();
  const pathname = usePathname();

  // Show loading skeleton while state loads
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="space-y-4 w-full max-w-md animate-pulse">
          <div className="h-10 bg-slate-800 rounded w-1/3 mx-auto"></div>
          <div className="h-40 bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Deny access if user is not logged in or is not an admin
  if (!storeUser || storeUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 text-xs">
        <div className="w-full max-w-sm bg-slate-850/50 border border-slate-700/50 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-slate-200">Ruxsat Etilmagan (Access Denied)</h2>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ushbu bo&apos;limga faqat platforma administratorlari kirishi mumkin. Shaxsiy profilingizga qaytishingiz tavsiya etiladi.
            </p>
          </div>
          <Link
            href="/profile"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-emerald-450 rounded-xl font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Shaxsiy profilga qaytish
          </Link>
        </div>
      </div>
    );
  }

  // Define Admin Navigation Tabs
  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
    { name: 'Moderatsiya', href: '/admin/moderation', icon: ClipboardList },
    { name: 'Sotuvchilar', href: '/admin/sellers', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20 w-full text-xs">
      {/* Admin Top Navigation Bar */}
      <header className="bg-slate-850 border-b border-slate-700/50 px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h1 className="text-xs font-bold text-slate-200 leading-none">AgroBozor Admin</h1>
            <span className="text-[9px] text-emerald-400 mt-0.5 block font-bold">Moderator boshqaruvi</span>
          </div>
        </div>

        <Link
          href="/profile"
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-lg text-slate-300 transition text-[10px] flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Profil
        </Link>
      </header>

      {/* Admin Horizontal Tab Menu */}
      <div className="bg-slate-850/40 border-b border-slate-800/40 px-4 py-2 flex gap-1.5 sticky top-[51px] z-30 backdrop-blur-md">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3.5 py-2 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition duration-150 ${
                isActive
                  ? 'bg-emerald-500 text-slate-900 border-emerald-450 shadow-md shadow-emerald-500/5'
                  : 'bg-slate-800 text-slate-400 border-slate-700/30 hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="p-4 w-full">
        {children}
      </main>
    </div>
  );
}

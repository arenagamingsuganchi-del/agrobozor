'use client';

import React from 'react';
import { useStore } from '@/store';
import { BottomNav } from '@/components/shared/bottom-nav';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-400">
        <div className="animate-pulse text-sm">Avtorizatsiya tekshirilmoqda...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col flex-1 min-h-screen pb-20 bg-slate-900 text-slate-100 font-sans justify-center items-center p-4">
        <div className="w-full max-w-md p-6 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xl font-bold">
            🔑
          </div>
          <h1 className="text-lg font-bold text-slate-200">Avtorizatsiya Zarur</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ushbu sahifadan foydalanish uchun Telegram Mini App orqali tizimga kirishingiz lozim. Iltimos, Telegram ilovasi orqali kiring.
          </p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen pb-20 bg-slate-900 text-slate-100 font-sans">
      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

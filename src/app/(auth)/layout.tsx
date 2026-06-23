'use client';

import React from 'react';
import { useStore } from '@/store';
import { BottomNav } from '@/components/shared/bottom-nav';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error: authError } = useStore();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] text-slate-500">
        <div className="animate-pulse text-sm font-medium">Avtorizatsiya tekshirilmoqda...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col flex-1 min-h-screen pb-20 bg-[var(--background)] text-[var(--foreground)] font-sans justify-center items-center p-4">
        <div className="w-full max-w-md p-6 bg-white border border-slate-200/80 rounded-2xl text-center space-y-4 shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-xl font-bold">
            🔑
          </div>
          <h1 className="text-lg font-bold text-slate-800">Avtorizatsiya Zarur</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ushbu sahifadan foydalanish uchun Telegram Mini App orqali tizimga kirishingiz lozim. Iltimos, Telegram ilovasi orqali kiring.
          </p>
          {authError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-left">
              <span className="text-[10px] font-semibold text-red-700 block mb-1">Xatolik tafsiloti:</span>
              <code className="text-[9px] text-red-650 font-mono break-all leading-normal block">{authError}</code>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen pb-20 bg-[var(--background)] text-[var(--foreground)] font-sans">
      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

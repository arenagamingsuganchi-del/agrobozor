import React from 'react';
import { BottomNav } from '@/components/shared/bottom-nav';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 min-h-screen pb-20 bg-[var(--background)] text-[var(--foreground)] font-sans">
      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-400">
      <div className="animate-pulse">Yuklanmoqda...</div>
    </div>
  );
}

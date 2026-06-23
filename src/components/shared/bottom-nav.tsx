'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, User, LayoutGrid, ClipboardList } from 'lucide-react';
import { useStore } from '@/store';

export function BottomNav() {
  const pathname = usePathname();
  const { cartItems } = useStore();

  const cartBadge = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'Categories', href: '/categories', icon: LayoutGrid },
    { label: 'Cart', href: '/cart', icon: ShoppingCart, badge: cartBadge },
    { label: 'Orders', href: '/orders', icon: ClipboardList },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-slate-150 flex items-center justify-around px-2 shadow-sm">
      <div className="w-full max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center space-y-1 w-16 h-full transition duration-150 relative ${
                isActive 
                  ? 'text-emerald-700 scale-105 font-semibold' 
                  : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className="w-5.5 h-5.5 stroke-[1.8]" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-emerald-600 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] tracking-wide mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

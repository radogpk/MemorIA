'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, BookOpen, CheckSquare, Sparkles } from 'lucide-react';
import { QuickAddModal } from '@/components/ai/QuickAddModal';

export function BottomNavigation() {
  const pathname = usePathname();
  const [isAiOpen, setIsAiOpen] = useState(false);

  const navItems = [
    { label: 'Calendario', href: '/calendar', icon: Calendar },
    { label: 'Materias', href: '/subjects', icon: BookOpen },
    { label: 'Tareas', href: '/tasks', icon: CheckSquare },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-800/90 bg-[#0c121e]/95 backdrop-blur-md md:hidden px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 text-xs transition ${
                isActive ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Floating memorIA AI trigger button on mobile */}
        <button
          onClick={() => setIsAiOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-3 text-xs text-indigo-400 hover:text-indigo-300 active:scale-95"
          aria-label="memorIA IA Quick Add"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold text-[10px]">memorIA</span>
        </button>
      </nav>

      <QuickAddModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </>
  );
}

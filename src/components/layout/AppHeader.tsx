'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Calendar, BookOpen, CheckSquare } from 'lucide-react';
import { QuickAddModal } from '@/components/ai/QuickAddModal';
import { LiveStatusBadge } from '@/components/dashboard/LiveStatusBadge';
import { ProfileSwitcher } from '@/components/layout/ProfileSwitcher';

export function AppHeader() {
  const [isAiOpen, setIsAiOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800/80 bg-[#0c121e]/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/calendar" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
              m
            </span>
            <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              memor<span className="font-extrabold text-blue-400">IA</span>
            </span>
          </Link>
          <span className="hidden sm:inline-block rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
            Duo 💖
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Profile Switcher */}
          <ProfileSwitcher />

          {/* Live Activity Status badge */}
          <div className="hidden sm:block">
            <LiveStatusBadge />
          </div>

          {/* Quick-Add button with memorIA AI */}
          <button
            onClick={() => setIsAiOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-blue-500 hover:to-indigo-500 transition active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-yellow-300" />
            <span className="hidden xs:inline">+ memorIA</span>
            <span className="xs:hidden">IA</span>
            <kbd className="hidden md:inline-block rounded bg-blue-900/50 px-1.5 py-0.5 text-[10px] text-blue-200 ml-1">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </header>

      {/* Global AI Quick-Add Modal */}
      <QuickAddModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, BookOpen, CheckSquare, Sparkles } from 'lucide-react';
import { useMemoria } from '@/lib/storage/store';

export function Sidebar() {
  const pathname = usePathname();
  const { subjects, activities } = useMemoria();

  const pendingTasksCount = activities.filter(
    (a) => a.type === 'task' && a.status !== 'completed'
  ).length;

  const navItems = [
    {
      label: 'Calendario',
      href: '/calendar',
      icon: Calendar,
      badge: null,
    },
    {
      label: 'Materias & Horario',
      href: '/subjects',
      icon: BookOpen,
      badge: subjects.length,
    },
    {
      label: 'Tareas & Entregas',
      href: '/tasks',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : null,
    },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-800/80 bg-[#0b0f19] p-4 text-sm">
      <div className="mb-6 px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-md shadow-blue-500/20">
            m
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-white">memorIA</h1>
            <p className="text-[11px] text-slate-400">Campus Productivity</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 font-medium transition ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Active Subjects quick list */}
      <div className="mt-8 border-t border-slate-800/80 pt-4">
        <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Mis Materias ({subjects.length})
        </h2>
        <div className="mt-2 space-y-1">
          {subjects.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/40"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom PWA Info */}
      <div className="mt-auto border-t border-slate-800/80 pt-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Modo Offline Listo</span>
        </div>
      </div>
    </aside>
  );
}

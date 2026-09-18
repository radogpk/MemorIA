'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, Plus } from 'lucide-react';
import { CalendarViewMode } from '@/lib/calendar/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenQuickAdd: () => void;
  onOpenManualAdd: () => void;
}

export function CalendarHeader({
  viewMode,
  onViewModeChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
  onOpenQuickAdd,
  onOpenManualAdd,
}: Props) {
  const formattedDate = format(currentDate, "MMMM 'de' yyyy", { locale: es });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 bg-[#0c121e] px-4 py-3">
      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 p-0.5">
          <button
            onClick={onPrev}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition"
            title="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onToday}
            className="rounded px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            Hoy
          </button>
          <button
            onClick={onNext}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition"
            title="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
          {capitalizedDate}
        </h2>
      </div>

      {/* View Switcher & Action buttons */}
      <div className="flex items-center gap-2">
        {/* View mode toggle */}
        <div className="flex rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-xs font-medium">
          {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => {
            const label = mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes';
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`rounded-md px-3 py-1 transition ${
                  isActive
                    ? 'bg-blue-600 font-semibold text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Manual Add Button */}
        <button
          onClick={onOpenManualAdd}
          className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
          title="Agregar actividad manual"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nueva Actividad</span>
        </button>

        {/* memorIA Quick-Add Button */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
          <span>memorIA</span>
        </button>
      </div>
    </div>
  );
}

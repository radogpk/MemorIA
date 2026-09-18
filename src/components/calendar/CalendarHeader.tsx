'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, Plus, Download, GraduationCap, Users, Heart } from 'lucide-react';
import { CalendarViewMode } from '@/lib/calendar/types';
import { useMemoria } from '@/lib/storage/store';
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
  onExportIcs?: () => void;
  onOpenStudyPlanner?: () => void;
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
  onExportIcs,
  onOpenStudyPlanner,
}: Props) {
  const { viewMode: duoMode, setViewMode: setDuoMode, activeProfile, partnerProfile } = useMemoria();
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
      <div className="flex flex-wrap items-center gap-2">
        {/* Duo View mode toggle */}
        <div className="flex rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-xs font-medium">
          <button
            onClick={() => setDuoMode('mine')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
              duoMode === 'mine'
                ? 'bg-blue-600 font-semibold text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={`Ver solo horario de ${activeProfile.name}`}
          >
            <span
              className="h-2 w-2 rounded-full inline-block"
              style={{ backgroundColor: activeProfile.avatar_color }}
            />
            <span className="hidden sm:inline">{activeProfile.nickname || activeProfile.name}</span>
            <span className="sm:hidden">Yo</span>
          </button>

          {partnerProfile && (
            <button
              onClick={() => setDuoMode('partner')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                duoMode === 'partner'
                  ? 'bg-pink-600 font-semibold text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Ver horario de ${partnerProfile.name}`}
            >
              <Heart className="h-3 w-3 text-pink-300 fill-pink-300" />
              <span className="hidden sm:inline">{partnerProfile.nickname || partnerProfile.name}</span>
              <span className="sm:hidden">Ella</span>
            </button>
          )}

          <button
            onClick={() => setDuoMode('both')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
              duoMode === 'both'
                ? 'bg-purple-600 font-semibold text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Ver ambos horarios superpuestos"
          >
            <Users className="h-3 w-3" />
            <span>Ambos</span>
          </button>
        </div>
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

        {/* Study Planner Button */}
        {onOpenStudyPlanner && (
          <button
            onClick={onOpenStudyPlanner}
            className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-900/50 hover:text-white transition"
            title="Planear sesiones de estudio para exámenes"
          >
            <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden lg:inline">Planear Estudio</span>
          </button>
        )}

        {/* ICS Export Button */}
        {onExportIcs && (
          <button
            onClick={onExportIcs}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title="Exportar a Google / Apple Calendar (.ics)"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Exportar .ics</span>
          </button>
        )}

        {/* Manual Add Button */}
        <button
          onClick={onOpenManualAdd}
          className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
          title="Agregar actividad manual"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Actividad</span>
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

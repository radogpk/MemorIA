'use client';

import React from 'react';
import { Subject } from '@/types/database.types';
import { Filter, Check } from 'lucide-react';

interface Props {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
}

const TYPE_FILTERS = [
  { id: null, label: 'Todo' },
  { id: 'class', label: 'Clases' },
  { id: 'exam', label: 'Exámenes' },
  { id: 'task', label: 'Tareas' },
  { id: 'meeting', label: 'Reuniones' },
];

export function CalendarFilterBar({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  selectedType,
  onSelectType,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 bg-[#090e17] px-4 py-2 text-xs">
      <div className="flex items-center gap-1 text-slate-500 mr-1">
        <Filter className="h-3 w-3" />
        <span className="font-semibold uppercase tracking-wider text-[10px]">Filtros:</span>
      </div>

      {/* Type filters */}
      <div className="flex items-center gap-1">
        {TYPE_FILTERS.map((f) => {
          const isActive = selectedType === f.id;
          return (
            <button
              key={f.label}
              onClick={() => onSelectType(f.id)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

      {/* Subject filters */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => onSelectSubject(null)}
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
            selectedSubjectId === null
              ? 'bg-slate-700 text-white font-semibold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Todas las materias
        </button>
        {subjects.map((s) => {
          const isActive = selectedSubjectId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectSubject(isActive ? null : s.id)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] transition ${
                isActive
                  ? 'ring-1 text-white font-medium'
                  : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
              }`}
              style={{
                backgroundColor: isActive ? `${s.color}25` : undefined,
                borderColor: s.color,
                color: isActive ? s.color : undefined,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.name}</span>
              {isActive && <Check className="h-3 w-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

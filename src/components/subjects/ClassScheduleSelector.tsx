'use client';

import React from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';

export interface ScheduleSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  classroom?: string;
}

interface Props {
  slots: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
}

const DAYS = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 7, name: 'Domingo' },
];

export function ClassScheduleSelector({ slots, onChange }: Props) {
  const addSlot = () => {
    onChange([
      ...slots,
      {
        day_of_week: 1,
        start_time: '08:00',
        end_time: '10:00',
        classroom: '',
      },
    ]);
  };

  const removeSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, updates: Partial<ScheduleSlot>) => {
    onChange(
      slots.map((slot, i) => (i === index ? { ...slot, ...updates } : slot))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Horario Semanal de Clases
        </label>
        <button
          type="button"
          onClick={addSlot}
          className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-blue-400 hover:bg-slate-700 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Agregar Día/Hora</span>
        </button>
      </div>

      {slots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-800 p-3 text-center text-xs text-slate-500">
          No has añadido horarios fijos aún. Agrega los días en que tomas esta clase.
        </p>
      ) : (
        <div className="space-y-2">
          {slots.map((slot, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-xs"
            >
              {/* Day selector */}
              <select
                value={slot.day_of_week}
                onChange={(e) =>
                  updateSlot(index, { day_of_week: Number(e.target.value) })
                }
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {DAYS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Start Time */}
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) => updateSlot(index, { start_time: e.target.value })}
                  className="rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-500">a</span>
                <input
                  type="time"
                  value={slot.end_time}
                  onChange={(e) => updateSlot(index, { end_time: e.target.value })}
                  className="rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Specific classroom override */}
              <input
                type="text"
                placeholder="Aula (opcional)"
                value={slot.classroom || ''}
                onChange={(e) => updateSlot(index, { classroom: e.target.value })}
                className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />

              <button
                type="button"
                onClick={() => removeSlot(index)}
                className="ml-auto rounded p-1 text-slate-500 hover:text-red-400 transition"
                title="Eliminar franja"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

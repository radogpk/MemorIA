'use client';

import React from 'react';
import { Subject, RecurrentClass } from '@/types/database.types';
import { Edit2, Trash2, MapPin, User, Clock } from 'lucide-react';

interface Props {
  subject: Subject;
  classes: RecurrentClass[];
  onEdit: (subject: Subject) => void;
  onDelete: (id: string) => void;
}

const DAY_NAMES: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

export function SubjectCard({ subject, classes, onEdit, onDelete }: Props) {
  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0d1320] p-4 transition hover:border-slate-700 hover:shadow-lg hover:shadow-black/40">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3.5 w-3.5 rounded-full ring-2 ring-offset-2 ring-offset-[#0d1320]"
              style={{ backgroundColor: subject.color, ringColor: subject.color }}
            />
            <div>
              <h3 className="font-semibold text-white group-hover:text-blue-300 transition">
                {subject.name}
              </h3>
              {subject.code && (
                <span className="text-[11px] font-mono text-slate-400">
                  {subject.code}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
            <button
              onClick={() => onEdit(subject)}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title="Editar"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(subject.id)}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Metadata: Professor & Classroom */}
        <div className="mt-3 space-y-1 text-xs text-slate-400">
          {subject.professor && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{subject.professor}</span>
            </div>
          )}
          {subject.classroom && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{subject.classroom}</span>
            </div>
          )}
        </div>
      </div>

      {/* Class Schedule Badges */}
      <div className="mt-4 border-t border-slate-800/80 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Horarios semanales
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {classes.length === 0 ? (
            <span className="text-xs text-slate-500 italic">Sin clases asignadas</span>
          ) : (
            classes.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1 rounded-md bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-300"
              >
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="font-semibold text-blue-400">
                  {DAY_NAMES[c.day_of_week]}:
                </span>
                <span>{c.start_time} - {c.end_time}</span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

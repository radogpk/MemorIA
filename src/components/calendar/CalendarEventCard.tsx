'use client';

import React from 'react';
import { CalendarEvent } from '@/lib/calendar/types';
import { format } from 'date-fns';
import { Clock, MapPin, AlertTriangle, CheckCircle, Check, Users } from 'lucide-react';

interface Props {
  event: CalendarEvent;
  onClick?: () => void;
  onToggleComplete?: () => void;
  compact?: boolean;
}

export function CalendarEventCard({
  event,
  onClick,
  onToggleComplete,
  compact = false,
}: Props) {
  const isCompleted = event.status === 'completed';
  const subjectColor = event.subject?.color || '#3b82f6';

  const startTimeStr = format(event.start, 'HH:mm');
  const endTimeStr = format(event.end, 'HH:mm');

  // Background and border styling based on type
  const getTypeStyles = () => {
    switch (event.type) {
      case 'class':
        return {
          bg: `${subjectColor}18`,
          border: `1px solid ${subjectColor}60`,
          accent: subjectColor,
          badgeText: 'Clase',
          badgeBg: `${subjectColor}30`,
        };
      case 'exam':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.6)',
          accent: '#ef4444',
          badgeText: 'EXAMEN',
          badgeBg: 'rgba(239, 68, 68, 0.3)',
        };
      case 'task':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          accent: '#f59e0b',
          badgeText: 'Tarea',
          badgeBg: 'rgba(245, 158, 11, 0.25)',
        };
      case 'meeting':
        return {
          bg: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.5)',
          accent: '#6366f1',
          badgeText: 'Reunión',
          badgeBg: 'rgba(99, 102, 241, 0.25)',
        };
      default:
        return {
          bg: 'rgba(100, 116, 139, 0.15)',
          border: '1px solid rgba(100, 116, 139, 0.4)',
          accent: '#64748b',
          badgeText: 'Evento',
          badgeBg: 'rgba(100, 116, 139, 0.2)',
        };
    }
  };

  const style = getTypeStyles();

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: style.bg,
        border: style.border,
        borderLeftWidth: '4px',
        borderLeftColor: style.accent,
      }}
      className={`group relative h-full w-full cursor-pointer rounded-lg p-1.5 transition overflow-hidden text-left hover:shadow-md hover:brightness-110 select-none ${
        isCompleted ? 'opacity-50 line-through' : ''
      }`}
    >
      {/* Collision Warning Banner */}
      {event.hasCollision && (
        <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/40">
          <AlertTriangle className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">Solapado</span>
        </div>
      )}

      {/* Top Header: Badge & Time */}
      <div className="flex items-center gap-1.5 leading-none flex-wrap">
        <span
          className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: style.badgeBg, color: style.accent }}
        >
          {style.badgeText}
        </span>

        {event.isShared && (
          <span className="flex items-center gap-0.5 rounded bg-pink-500/20 px-1 py-0.5 text-[9px] font-bold text-pink-300 border border-pink-500/40">
            <span className="text-[9px]">💖</span>
            <span>Juntos</span>
          </span>
        )}

        {!event.isShared && event.profileId === 'prof-novia' && (
          <span className="flex items-center gap-0.5 rounded bg-pink-900/30 px-1 py-0.5 text-[9px] font-medium text-pink-400">
            <span>Novia</span>
          </span>
        )}

        <span className="text-[10px] font-medium text-slate-300">
          {startTimeStr} - {endTimeStr}
        </span>
      </div>

      {/* Title */}
      <div className="mt-1 font-semibold text-xs text-white leading-tight line-clamp-1">
        {event.title}
      </div>

      {/* Details: Classroom / Subject / Description */}
      {!compact && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          {event.classroom && (
            <div className="flex items-center gap-0.5 text-slate-300">
              <MapPin className="h-2.5 w-2.5 text-slate-500" />
              <span>{event.classroom}</span>
            </div>
          )}
          {event.professor && (
            <div className="hidden sm:inline-block truncate">
              {event.professor}
            </div>
          )}
        </div>
      )}

      {/* Completion toggle for tasks */}
      {event.type === 'task' && onToggleComplete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded border border-slate-600 bg-slate-800 hover:border-emerald-500 hover:text-emerald-400 transition"
          title={isCompleted ? 'Desmarcar tarea' : 'Marcar como completada'}
        >
          {isCompleted && <Check className="h-3 w-3 text-emerald-400" />}
        </button>
      )}
    </div>
  );
}

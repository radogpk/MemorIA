'use client';

import React, { useMemo } from 'react';
import { useMemoria } from '@/lib/storage/store';
import { projectRecurrentClassesForRange, formatActivitiesToCalendarEvents } from '@/lib/calendar/projection';
import { calculateDailyStatus } from '@/lib/calendar/daily-status';
import { startOfDay, endOfDay } from 'date-fns';
import { MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

export function LiveStatusBadge() {
  const { recurrentClasses, activities } = useMemoria();

  const status = useMemo(() => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const projected = projectRecurrentClassesForRange(recurrentClasses, dayStart, dayEnd);
    const actEvents = formatActivitiesToCalendarEvents(activities);
    const combined = [...projected, ...actEvents];

    return calculateDailyStatus(combined, now);
  }, [recurrentClasses, activities]);

  if (status.currentEvent) {
    return (
      <Link
        href="/today"
        className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-900/50 transition"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-semibold truncate max-w-[150px]">
          En curso: {status.currentEvent.title}
        </span>
        {status.currentEvent.classroom && (
          <span className="flex items-center gap-0.5 text-slate-400 text-[10px]">
            <MapPin className="h-2.5 w-2.5" />
            <span>{status.currentEvent.classroom}</span>
          </span>
        )}
      </Link>
    );
  }

  if (status.isLunchTime) {
    return (
      <Link
        href="/today"
        className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/30 px-3 py-1 text-xs text-amber-300 hover:bg-amber-900/40 transition"
      >
        <span>🍽️</span>
        <span className="font-medium">Hora de Almuerzo</span>
      </Link>
    );
  }

  if (status.nextEvent && status.minutesToNextEvent !== null && status.minutesToNextEvent <= 120) {
    return (
      <Link
        href="/today"
        className="hidden sm:flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/30 px-3 py-1 text-xs text-blue-300 hover:bg-blue-900/40 transition"
      >
        <Clock className="h-3 w-3 text-blue-400" />
        <span className="truncate max-w-[180px]">
          Próxima ({status.minutesToNextEvent}m): {status.nextEvent.title}
        </span>
      </Link>
    );
  }

  return null;
}

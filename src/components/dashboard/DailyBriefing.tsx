'use client';

import React, { useMemo } from 'react';
import { useMemoria } from '@/lib/storage/store';
import { projectRecurrentClassesForRange, formatActivitiesToCalendarEvents } from '@/lib/calendar/projection';
import { calculateDailyStatus } from '@/lib/calendar/daily-status';
import { startOfDay, endOfDay, format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  AlertCircle,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Utensils,
  Check,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  onOpenQuickAdd: () => void;
  onOpenPlanner: () => void;
}

export function DailyBriefing({ onOpenQuickAdd, onOpenPlanner }: Props) {
  const { subjects, recurrentClasses, activities, toggleActivityStatus } = useMemoria();

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const status = useMemo(() => {
    const projected = projectRecurrentClassesForRange(recurrentClasses, dayStart, dayEnd);
    const actEvents = formatActivitiesToCalendarEvents(activities);
    const combined = [...projected, ...actEvents];

    return calculateDailyStatus(combined, now);
  }, [recurrentClasses, activities]);

  // Next upcoming exam
  const nextExam = useMemo(() => {
    return activities
      .filter((a) => a.type === 'exam' && new Date(a.start_datetime) > now)
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())[0];
  }, [activities]);

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const formattedToday = format(now, "EEEE d 'de' MMMM", { locale: es });
  const capitalizedToday = formattedToday.charAt(0).toUpperCase() + formattedToday.slice(1);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            {capitalizedToday}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            {greeting()}, estudiante 🎓
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            <span>+ memorIA</span>
          </button>
          <Link
            href="/calendar"
            className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Ver Calendario</span>
          </Link>
        </div>
      </div>

      {/* Hero Live Status Card */}
      {status.currentEvent ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 to-[#0d1620] p-5 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span>Actividad en curso ahora mismo</span>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                {status.currentEvent.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    {format(status.currentEvent.start, 'HH:mm')} - {format(status.currentEvent.end, 'HH:mm')}
                  </span>
                </span>
                {status.currentEvent.classroom && (
                  <span className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-emerald-300 border border-emerald-500/30">
                    <MapPin className="h-3 w-3" />
                    <span>{status.currentEvent.classroom}</span>
                  </span>
                )}
                {status.currentEvent.professor && (
                  <span className="text-slate-400">Docente: {status.currentEvent.professor}</span>
                )}
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800/80 sm:pl-6">
              <span className="text-[11px] text-slate-400">Finaliza a las</span>
              <div className="text-lg font-mono font-bold text-white">
                {format(status.currentEvent.end, 'HH:mm')}
              </div>
            </div>
          </div>
        </div>
      ) : status.nextEvent ? (
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-[#0d1424] p-5 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
            <Clock className="h-4 w-4" />
            <span>Próxima actividad hoy</span>
            {status.minutesToNextEvent !== null && (
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300">
                en {status.minutesToNextEvent} minutos
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">{status.nextEvent.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  <span>
                    {format(status.nextEvent.start, 'HH:mm')} - {format(status.nextEvent.end, 'HH:mm')}
                  </span>
                </span>
                {status.nextEvent.classroom && (
                  <span className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-blue-300 border border-blue-500/30">
                    <MapPin className="h-3 w-3" />
                    <span>{status.nextEvent.classroom}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-[#0d1320] p-5 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
          <h2 className="mt-2 text-base font-bold text-white">¡Día libre de clases por hoy!</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Aprovecha para avanzar tareas o planear tus sesiones de estudio.
          </p>
        </div>
      )}

      {/* Two Column Grid: Today's Timeline + Focus & Exam Countdown */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left 2 Cols: Timeline for Today */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Cronograma de Hoy ({status.todayEvents.length})
            </h2>
            {status.totalTasksToday > 0 && (
              <span className="text-xs text-slate-400">
                Tareas: {status.tasksDoneToday}/{status.totalTasksToday} completadas
              </span>
            )}
          </div>

          {status.todayEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
              No tienes eventos programados para hoy en tu calendario.
            </div>
          ) : (
            <div className="space-y-2">
              {status.todayEvents.map((e) => {
                const isPastEvent = now > e.end;
                const isCurrent = now >= e.start && now <= e.end;

                return (
                  <div
                    key={e.id}
                    className={`flex items-center justify-between rounded-xl border p-3 transition ${
                      isCurrent
                        ? 'border-emerald-500/50 bg-emerald-950/20'
                        : isPastEvent
                        ? 'border-slate-800/40 bg-[#0a0e17]/40 opacity-50'
                        : 'border-slate-800 bg-[#0d1320]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs font-semibold text-slate-400 w-16 text-right shrink-0">
                        {format(e.start, 'HH:mm')}
                      </div>

                      <div
                        className="h-8 w-1 rounded-full shrink-0"
                        style={{ backgroundColor: e.subject?.color || '#3b82f6' }}
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">
                            {e.title}
                          </span>
                          {isCurrent && (
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                              AHORA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{format(e.start, 'HH:mm')} - {format(e.end, 'HH:mm')}</span>
                          {e.classroom && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-slate-300">
                                <MapPin className="h-3 w-3 text-slate-500" />
                                {e.classroom}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Checkbox if task */}
                    {e.type === 'task' && e.sourceActivity && (
                      <button
                        onClick={() => toggleActivityStatus(e.sourceActivity!.id)}
                        className={`flex h-6 w-6 items-center justify-center rounded-md border transition ${
                          e.status === 'completed'
                            ? 'border-emerald-500 bg-emerald-600 text-white'
                            : 'border-slate-700 bg-slate-800 hover:border-blue-500'
                        }`}
                      >
                        {e.status === 'completed' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Info Cards */}
        <div className="space-y-4">
          {/* Lunch Time Slot Card */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Utensils className="h-4 w-4" />
              <span>Pausa de Almuerzo</span>
            </div>
            <p className="mt-1 text-xs text-slate-300 font-semibold">13:00 - 14:00</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tu horario reserva este espacio para descanso y comida.
            </p>
          </div>

          {/* Exam Countdown Card */}
          {nextExam ? (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                  <GraduationCap className="h-4 w-4" />
                  Próximo Examen
                </span>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  {differenceInDays(new Date(nextExam.start_datetime), now)} días
                </span>
              </div>
              <h3 className="font-bold text-sm text-white">{nextExam.title}</h3>
              <p className="text-[11px] text-slate-400">
                {format(new Date(nextExam.start_datetime), "EEEE d 'de' MMMM", { locale: es })}
              </p>

              <button
                onClick={onOpenPlanner}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Planear Sesiones de Estudio</span>
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#0d1320] p-4 text-center text-xs text-slate-500">
              No tienes exámenes registrados próximamente.
            </div>
          )}

          {/* Direct Link to subjects */}
          <div className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tus Asignaturas ({subjects.length})
            </h3>
            <div className="mt-2 space-y-1">
              {subjects.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.name}</span>
                  </div>
                  {s.classroom && <span className="text-[10px] text-slate-500">{s.classroom}</span>}
                </div>
              ))}
            </div>
            <Link
              href="/subjects"
              className="mt-3 flex items-center justify-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              <span>Ver todas las materias</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

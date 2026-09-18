'use client';

import React, { useState, useMemo } from 'react';
import { X, GraduationCap, Calendar, Clock, Check, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { useMemoria } from '@/lib/storage/store';
import { CalendarEvent } from '@/lib/calendar/types';
import { findSmartStudySlots, FreeStudySlot } from '@/lib/calendar/free-slots';
import { format, parseISO, differenceInDays, differenceInHours, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  busyEvents: CalendarEvent[];
}

export function SmartStudyPlannerModal({ isOpen, onClose, busyEvents }: Props) {
  const { activities, addActivity } = useMemoria();

  // Find upcoming exams
  const upcomingExams = useMemo(() => {
    const now = new Date();
    return activities
      .filter((a) => a.type === 'exam' && new Date(a.start_datetime) > now)
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  }, [activities]);

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [sessionCount, setSessionCount] = useState<number>(2);
  const [sessionDuration, setSessionDuration] = useState<number>(90); // 90 mins
  const [generatedSlots, setGeneratedSlots] = useState<FreeStudySlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  // Default selection
  React.useEffect(() => {
    if (upcomingExams.length > 0 && !selectedExamId) {
      setSelectedExamId(upcomingExams[0].id);
    }
  }, [upcomingExams, selectedExamId]);

  if (!isOpen) return null;

  const selectedExam = upcomingExams.find((e) => e.id === selectedExamId);

  const handleGenerateSlots = () => {
    if (!selectedExam) return;

    const examDate = parseISO(selectedExam.start_datetime);
    const slotsFound: FreeStudySlot[] = [];

    // Check up to 5 days before exam
    for (let i = 4; i >= 1; i--) {
      const day = subDays(examDate, i);
      if (day < new Date()) continue;

      const daySlots = findSmartStudySlots(day, busyEvents, sessionDuration);
      for (const slot of daySlots) {
        slotsFound.push(slot);
        if (slotsFound.length >= sessionCount * 2) break;
      }
      if (slotsFound.length >= sessionCount * 2) break;
    }

    setGeneratedSlots(slotsFound);
    // Select the first N slots
    setSelectedSlots(slotsFound.slice(0, sessionCount).map((_, idx) => idx));
    setIsSuccess(false);
  };

  const handleBookSessions = () => {
    if (!selectedExam) return;

    const chosen = selectedSlots.map((idx) => generatedSlots[idx]).filter(Boolean);

    for (const slot of chosen) {
      addActivity({
        title: `Estudio: ${selectedExam.title.slice(0, 30)}`,
        description: `Sesión de repaso programada automáticamente para el examen de ${selectedExam.subject?.name || 'materia'}.`,
        type: 'task',
        subject_id: selectedExam.subject_id,
        start_datetime: slot.start.toISOString(),
        end_datetime: slot.end.toISOString(),
        is_all_day: false,
        priority: 'high',
        status: 'pending',
        metadata: { is_auto_study_block: true, target_exam_id: selectedExam.id },
      });
    }

    setIsSuccess(true);
    setTimeout(() => {
      onClose();
      setIsSuccess(false);
      setGeneratedSlots([]);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-[#0f1422] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Planificador de Estudio IA</h2>
              <p className="text-[11px] text-slate-400">Reserva bloques libres para no estudiar a última hora</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {upcomingExams.length === 0 ? (
          <div className="py-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-500" />
            <p className="mt-2 text-sm text-slate-300 font-semibold">No tienes exámenes próximos agendados</p>
            <p className="text-xs text-slate-500 mt-1">
              Agrega un examen desde el calendario o con memorIA (`Ctrl+K`) para calcular tus sesiones.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-xs">
            {/* Exam selection */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Selecciona el Examen / Evaluación:
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {upcomingExams.map((ex) => {
                  const daysLeft = differenceInDays(new Date(ex.start_datetime), new Date());
                  return (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} — {daysLeft <= 0 ? '¡HOY!' : `en ${daysLeft} días`} ({ex.subject?.name || 'Materia'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Countdown Banner */}
            {selectedExam && (
              <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span className="text-slate-200">
                    Fecha del examen:{' '}
                    <strong>
                      {format(new Date(selectedExam.start_datetime), "EEEE d 'de' MMMM, HH:mm", {
                        locale: es,
                      })}
                    </strong>
                  </span>
                </div>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  {differenceInDays(new Date(selectedExam.start_datetime), new Date())} días restantes
                </span>
              </div>
            )}

            {/* Plan Preferences */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Sesiones deseadas</label>
                <select
                  value={sessionCount}
                  onChange={(e) => setSessionCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value={1}>1 sesión intensa</option>
                  <option value={2}>2 sesiones espaciadas</option>
                  <option value={3}>3 sesiones de repaso</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Duración por sesión</label>
                <select
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value={60}>60 minutos (1 hora)</option>
                  <option value={90}>90 minutos (1.5 horas)</option>
                  <option value={120}>120 minutos (2 horas)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateSlots}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Buscar Huecos Libres Óptimos</span>
            </button>

            {/* Generated Slots List */}
            {generatedSlots.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
                <span className="font-semibold text-slate-300">
                  Huecos libres encontrados (sin clases ni trabajo):
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {generatedSlots.map((slot, idx) => {
                    const isChecked = selectedSlots.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedSlots(selectedSlots.filter((i) => i !== idx));
                          } else {
                            setSelectedSlots([...selectedSlots, idx]);
                          }
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition ${
                          isChecked
                            ? 'border-indigo-500 bg-indigo-950/40 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600'
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="font-semibold capitalize text-slate-200">
                              {format(slot.start, 'EEEE d MMM', { locale: es })}
                            </span>
                            <span className="ml-2 font-mono text-xs text-indigo-400">
                              {format(slot.start, 'HH:mm')} - {format(slot.end, 'HH:mm')}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">{slot.durationMinutes} min libres</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-3 py-1.5 text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={selectedSlots.length === 0}
                    onClick={handleBookSessions}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-40 transition"
                  >
                    <Check className="h-4 w-4" />
                    <span>{isSuccess ? '¡Sesiones Agendadas!' : `Agendar ${selectedSlots.length} Sesiones`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

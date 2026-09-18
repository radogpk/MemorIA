'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Tag, AlertCircle, Trash2, CheckCircle } from 'lucide-react';
import { Activity, ActivityType, ActivityPriority, ActivityStatus, CreateActivityInput } from '@/types/database.types';
import { useMemoria } from '@/lib/storage/store';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialHour?: number;
  initialActivity?: Activity | null;
}

export function ActivityModal({
  isOpen,
  onClose,
  initialDate,
  initialHour,
  initialActivity,
}: Props) {
  const { subjects, profiles, activeProfile, partnerProfile, addActivity, updateActivity, deleteActivity } = useMemoria();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ActivityType>('task');
  const [profileId, setProfileId] = useState<string>(activeProfile.id);
  const [isShared, setIsShared] = useState<boolean>(false);
  const [subjectId, setSubjectId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [priority, setPriority] = useState<ActivityPriority>('medium');
  const [status, setStatus] = useState<ActivityStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialActivity) {
      setTitle(initialActivity.title);
      setDescription(initialActivity.description || '');
      setType(initialActivity.type);
      setSubjectId(initialActivity.subject_id || '');
      setPriority(initialActivity.priority);
      setStatus(initialActivity.status);
      setProfileId(initialActivity.profile_id || activeProfile.id);
      setIsShared(!!initialActivity.is_shared);

      const start = new Date(initialActivity.start_datetime);
      setStartDate(format(start, 'yyyy-MM-dd'));
      setStartTime(format(start, 'HH:mm'));

      if (initialActivity.end_datetime) {
        setEndTime(format(new Date(initialActivity.end_datetime), 'HH:mm'));
      } else {
        setEndTime('09:00');
      }
    } else {
      const baseDate = initialDate || new Date();
      setStartDate(format(baseDate, 'yyyy-MM-dd'));

      const hour = initialHour !== undefined ? initialHour : 8;
      const hourStr = hour.toString().padStart(2, '0');
      const nextHourStr = Math.min(23, hour + 1).toString().padStart(2, '0');

      setTitle('');
      setDescription('');
      setType('task');
      setSubjectId(subjects[0]?.id || '');
      setProfileId(activeProfile.id);
      setIsShared(false);
      setStartTime(`${hourStr}:00`);
      setEndTime(`${nextHourStr}:00`);
      setPriority('medium');
      setStatus('pending');
    }
    setErrorMessage(null);
  }, [initialActivity, initialDate, initialHour, isOpen, subjects, activeProfile.id]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('El título de la actividad es obligatorio.');
      return;
    }

    const startDatetime = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endDatetime = new Date(`${startDate}T${endTime}:00`).toISOString();

    const payload: CreateActivityInput = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      profile_id: profileId,
      is_shared: isShared,
      subject_id: subjectId || null,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      is_all_day: false,
      priority,
      status,
      metadata: {},
    };

    if (initialActivity) {
      updateActivity(initialActivity.id, payload);
    } else {
      addActivity(payload);
    }

    onClose();
  };

  const handleDelete = () => {
    if (initialActivity) {
      deleteActivity(initialActivity.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0f1523] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white">
            {initialActivity ? 'Detalles de la Actividad' : 'Nueva Actividad / Tarea'}
          </h2>
          <div className="flex items-center gap-1">
            {initialActivity && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition"
                title="Eliminar actividad"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block font-medium text-slate-400">
              Título de la actividad o entrega *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Taller de Derivadas o Reunión con tutor"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-400">Tipo de evento</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="task">Tarea / Entrega</option>
                <option value="exam">Examen / Evaluación</option>
                <option value="meeting">Reunión</option>
                <option value="personal">Actividad Personal</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-400">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ActivityPriority)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente 🔥</option>
              </select>
            </div>
          </div>

          {/* Duo Profile Owner & Shared Activity */}
          <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              ¿A quién pertenece?
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              {profiles.map((p) => {
                const isSelected = profileId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfileId(p.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: p.avatar_color }}
                    />
                    <span>{p.nickname || p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Shared toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-pink-500 focus:ring-pink-400 focus:ring-offset-0"
              />
              <span className="flex items-center gap-1">
                <span>💖</span>
                <span className="font-semibold text-pink-300">Actividad compartida en pareja</span>
                <span className="text-slate-400 text-[11px]">(Visible en ambos calendarios)</span>
              </span>
            </label>
          </div>

          {/* Associated Subject */}
          <div>
            <label className="block font-medium text-slate-400">
              Materia asociada (opcional)
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Ninguna / Personal</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time slots */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-medium text-slate-400">Fecha</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-400">Hora Inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-400">Hora Fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-slate-400">
              Descripción, instrucciones o enlaces
            </label>
            <textarea
              rows={3}
              placeholder="Detalles de la entrega, enlace a la videollamada, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 transition shadow-md shadow-blue-600/20"
            >
              {initialActivity ? 'Actualizar Actividad' : 'Crear Actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

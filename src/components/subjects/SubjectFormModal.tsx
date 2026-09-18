'use client';

import React, { useState, useEffect } from 'react';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import { Subject, CreateSubjectInput } from '@/types/database.types';
import { ClassScheduleSelector, ScheduleSlot } from './ClassScheduleSelector';
import { validateSubjectInput, validateClassScheduleSlot } from '@/lib/actions/subjects-validation';
import { useMemoria } from '@/lib/storage/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subjectData: CreateSubjectInput, slots: ScheduleSlot[]) => void;
  initialSubject?: Subject | null;
  initialSlots?: ScheduleSlot[];
}

const COLOR_PRESETS = [
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#ef4444', // Red
  '#14b8a6', // Teal
];

export function SubjectFormModal({
  isOpen,
  onClose,
  onSave,
  initialSubject,
  initialSlots = [],
}: Props) {
  const { profiles, activeProfile } = useMemoria();
  const [profileId, setProfileId] = useState<string>(activeProfile.id);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [professor, setProfessor] = useState('');
  const [classroom, setClassroom] = useState('');
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubject) {
      setProfileId(initialSubject.profile_id || activeProfile.id);
      setName(initialSubject.name);
      setCode(initialSubject.code || '');
      setColor(initialSubject.color);
      setProfessor(initialSubject.professor || '');
      setClassroom(initialSubject.classroom || '');
      setSlots(initialSlots);
    } else {
      setProfileId(activeProfile.id);
      setName('');
      setCode('');
      setColor('#3b82f6');
      setProfessor('');
      setClassroom('');
      setSlots([]);
    }
    setErrorMessage(null);
  }, [initialSubject, initialSlots, isOpen, activeProfile.id]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate subject
    const subjectValidation = validateSubjectInput({ name, color, code });
    if (!subjectValidation.valid) {
      setErrorMessage(subjectValidation.error || 'Error en los datos de la materia.');
      return;
    }

    // Validate schedule slots
    for (const slot of slots) {
      const slotValidation = validateClassScheduleSlot(slot);
      if (!slotValidation.valid) {
        setErrorMessage(slotValidation.error || 'Error en las franjas horarias.');
        return;
      }
    }

    onSave(
      {
        name: name.trim(),
        code: code.trim() || null,
        color,
        professor: professor.trim() || null,
        classroom: classroom.trim() || null,
        is_active: true,
        profile_id: profileId,
      },
      slots
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0f1523] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: color }}
            >
              <BookOpen className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white">
              {initialSubject ? 'Editar Materia' : 'Nueva Materia & Horario'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Profile Owner Selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              ¿A qué perfil corresponde esta materia?
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {profiles.map((p) => {
                const isSelected = profileId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfileId(p.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
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
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400">
                Nombre de la materia *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Cálculo Diferencial"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Código
              </label>
              <input
                type="text"
                placeholder="MAT-101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Profesor(a)
              </label>
              <input
                type="text"
                placeholder="Ej. Dra. Lovelace"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Aula / Ubicación general
              </label>
              <input
                type="text"
                placeholder="Ej. Aula 204 / Edif B"
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Color palette */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Color de identificación
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setColor(preset)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    color === preset ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Color personalizado"
              />
            </div>
          </div>

          {/* Schedule slots */}
          <div className="border-t border-slate-800 pt-3">
            <ClassScheduleSelector slots={slots} onChange={setSlots} />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 transition shadow-md shadow-blue-600/20"
            >
              Guardar Materia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

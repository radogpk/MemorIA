'use client';

import React, { useState } from 'react';
import { useMemoria } from '@/lib/storage/store';
import { SubjectCard } from '@/components/subjects/SubjectCard';
import { SubjectFormModal } from '@/components/subjects/SubjectFormModal';
import { ScheduleSlot } from '@/components/subjects/ClassScheduleSelector';
import { Subject, CreateSubjectInput } from '@/types/database.types';
import { Plus, BookOpen, Clock } from 'lucide-react';

export default function SubjectsPage() {
  const { subjects, recurrentClasses, addSubject, updateSubject, deleteSubject } = useMemoria();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleSave = (input: CreateSubjectInput, slots: ScheduleSlot[]) => {
    if (editingSubject) {
      updateSubject(editingSubject.id, input);
      // Clean up previous classes and re-add updated slots
      // (The store handles updates smoothly)
    } else {
      addSubject(input, slots);
    }
  };

  const getSubjectClasses = (subjectId: string) => {
    return recurrentClasses.filter((c) => c.subject_id === subjectId);
  };

  const editingSlots: ScheduleSlot[] = editingSubject
    ? recurrentClasses
        .filter((c) => c.subject_id === editingSubject.id)
        .map((c) => ({
          day_of_week: c.day_of_week,
          start_time: c.start_time,
          end_time: c.end_time,
          classroom: c.classroom || '',
        }))
    : [];

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
            Materias & Horario Semanal
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Define tus asignaturas, aulas, profesores y los días/horas en que tomas cada clase.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Materia</span>
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">No tienes materias registradas</h3>
          <p className="mt-1 max-w-md text-xs text-slate-400">
            Agrega tu primera materia con sus días y horarios para que aparezcan automáticamente en tu calendario semanal.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Materia</span>
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              classes={getSubjectClasses(subject.id)}
              onEdit={handleOpenEdit}
              onDelete={deleteSubject}
            />
          ))}
        </div>
      )}

      <SubjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialSubject={editingSubject}
        initialSlots={editingSlots}
      />
    </div>
  );
}

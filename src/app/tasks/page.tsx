'use client';

import React, { useState } from 'react';
import { useMemoria } from '@/lib/storage/store';
import { TaskList } from '@/components/tasks/TaskList';
import { ActivityModal } from '@/components/tasks/ActivityModal';
import { QuickAddModal } from '@/components/ai/QuickAddModal';
import { Plus, Sparkles, Search, CheckSquare } from 'lucide-react';
import { Activity } from '@/types/database.types';

export default function TasksPage() {
  const {
    activities,
    subjects,
    toggleActivityStatus,
    deleteActivity,
    viewMode: duoMode,
    activeProfile,
    partnerProfile,
  } = useMemoria();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Modals
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Filter tasks
  const filteredActivities = activities.filter((act) => {
    // Only show tasks and exams in the tasks board
    if (act.type !== 'task' && act.type !== 'exam') return false;

    // Filter by Duo viewMode
    if (duoMode === 'mine') {
      const actProfile = act.profile_id || act.subject?.profile_id || 'prof-luis';
      if (actProfile !== activeProfile.id && !act.is_shared) return false;
    } else if (duoMode === 'partner' && partnerProfile) {
      const actProfile = act.profile_id || act.subject?.profile_id || 'prof-luis';
      if (actProfile !== partnerProfile.id && !act.is_shared) return false;
    }

    if (selectedSubjectId && act.subject_id !== selectedSubjectId) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = act.title.toLowerCase().includes(q);
      const matchesDesc = act.description?.toLowerCase().includes(q);
      const matchesSubject = act.subject?.name.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDesc && !matchesSubject) return false;
    }

    return true;
  });

  const handleOpenCreate = () => {
    setEditingActivity(null);
    setIsActivityModalOpen(true);
  };

  const handleOpenEdit = (act: Activity) => {
    setEditingActivity(act);
    setIsActivityModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
            Tareas & Evaluaciones
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Control de entregas, exámenes y actividades pendientes organizadas por urgencia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
            <span>+ memorIA</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Search & Subject Filter Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por título, descripción o materia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-[#0d1320] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSubjectId(null)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition shrink-0 ${
              selectedSubjectId === null
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas
          </button>
          {subjects.map((s) => {
            const isSelected = selectedSubjectId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectId(isSelected ? null : s.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition shrink-0 ${
                  isSelected
                    ? 'ring-1 text-white font-medium'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
                style={{
                  borderColor: s.color,
                  backgroundColor: isSelected ? `${s.color}20` : undefined,
                  color: isSelected ? s.color : undefined,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate max-w-[120px]">{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Task List */}
      <div className="mt-6">
        <TaskList
          activities={filteredActivities}
          onToggle={toggleActivityStatus}
          onEdit={handleOpenEdit}
          onDelete={deleteActivity}
        />
      </div>

      {/* Modals */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        initialActivity={editingActivity}
      />

      <QuickAddModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Activity } from "@/types/database.types";
import { TaskItem } from "./TaskItem";
import { groupTasksByDueCategory } from "@/lib/tasks/grouping";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Calendar,
  CheckCircle2,
} from "lucide-react";

interface Props {
  activities: Activity[];
  onToggle: (id: string) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
}

export function TaskList({ activities, onToggle, onEdit, onDelete }: Props) {
  const [showCompleted, setShowCompleted] = useState(false);
  const groups = groupTasksByDueCategory(activities);

  const renderSection = (
    title: string,
    items: Activity[],
    icon: React.ReactNode,
    badgeColor: string,
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          {icon}
          <span>{title}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${badgeColor}`}
          >
            {items.length}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((act) => (
            <TaskItem
              key={act.id}
              activity={act}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    );
  };

  const totalPending =
    groups.overdue.length +
    groups.today.length +
    groups.thisWeek.length +
    groups.upcoming.length;

  return (
    <div className="space-y-6">
      {/* Overdue */}
      {renderSection(
        "Vencidas",
        groups.overdue,
        <AlertTriangle className="h-4 w-4 text-red-400" />,
        "bg-red-500/20 text-red-400",
      )}

      {/* Today */}
      {renderSection(
        "Para Hoy",
        groups.today,
        <Calendar className="h-4 w-4 text-amber-400" />,
        "bg-amber-500/20 text-amber-300",
      )}

      {/* This Week */}
      {renderSection(
        "Esta Semana",
        groups.thisWeek,
        <Calendar className="h-4 w-4 text-blue-400" />,
        "bg-blue-500/20 text-blue-300",
      )}

      {/* Upcoming */}
      {renderSection(
        "Próximas Entregas",
        groups.upcoming,
        <Calendar className="h-4 w-4 text-slate-400" />,
        "bg-slate-800 text-slate-300",
      )}

      {totalPending === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
          <p className="mt-2 text-sm font-semibold text-white">¡Todo al día!</p>
          <p className="text-xs text-slate-500">
            No tienes tareas pendientes por entregar.
          </p>
        </div>
      )}

      {/* Completed Section Toggle */}
      {groups.completed.length > 0 && (
        <div className="border-t border-slate-800 pt-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            {showCompleted ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Completadas ({groups.completed.length})</span>
          </button>

          {showCompleted && (
            <div className="mt-3 space-y-2">
              {groups.completed.map((act) => (
                <TaskItem
                  key={act.id}
                  activity={act}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

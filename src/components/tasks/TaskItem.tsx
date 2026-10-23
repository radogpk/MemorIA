"use client";

import React from "react";
import { Activity } from "@/types/database.types";
import { useMemoria } from "@/lib/storage/store";
import {
  Check,
  Clock,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  activity: Activity;
  onToggle: (id: string) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ activity, onToggle, onEdit, onDelete }: Props) {
  const { profiles, activeProfile } = useMemoria();
  const owner = profiles.find((p) => p.id === activity.profile_id);
  const isCompleted = activity.status === "completed";
  const dueDate = parseISO(activity.start_datetime);
  const isOverdue = !isCompleted && isPast(dueDate) && !isToday(dueDate);

  const formattedDate = format(dueDate, "d 'de' MMM, HH:mm", { locale: es });

  const getPriorityBadge = () => {
    switch (activity.priority) {
      case "urgent":
        return (
          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
            Urgente
          </span>
        );
      case "high":
        return (
          <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
            Alta
          </span>
        );
      case "medium":
        return (
          <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
            Media
          </span>
        );
      default:
        return (
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
            Baja
          </span>
        );
    }
  };

  return (
    <div
      className={`group flex items-center justify-between rounded-xl border p-3 transition ${
        isCompleted
          ? "border-slate-800/50 bg-[#0a0e17]/40 opacity-60"
          : isOverdue
            ? "border-red-500/30 bg-red-950/10"
            : "border-slate-800 bg-[#0d1320] hover:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Toggle Checkbox */}
        <button
          type="button"
          onClick={() => onToggle(activity.id)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
            isCompleted
              ? "border-emerald-500 bg-emerald-600 text-white"
              : "border-slate-700 bg-slate-800 hover:border-blue-500"
          }`}
          title={isCompleted ? "Desmarcar" : "Completar"}
        >
          {isCompleted && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold truncate ${
                isCompleted ? "line-through text-slate-400" : "text-white"
              }`}
            >
              {activity.title}
            </span>

            {/* Subject badge */}
            {activity.subject && (
              <span
                className="hidden sm:inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `${activity.subject.color}20`,
                  color: activity.subject.color,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: activity.subject.color }}
                />
                {activity.subject.name}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            {/* Due date */}
            <span
              className={`flex items-center gap-1 ${
                isOverdue ? "font-bold text-red-400" : "text-slate-400"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>{formattedDate}</span>
              {isOverdue && <span>(Vencida)</span>}
            </span>

            {/* Priority */}
            {getPriorityBadge()}

            {/* Couple Shared Badge */}
            {activity.is_shared && (
              <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-bold text-pink-300 border border-pink-500/30">
                Compartida
              </span>
            )}

            {!activity.is_shared && owner && owner.id !== activeProfile.id && (
              <span className="rounded bg-pink-900/30 px-1.5 py-0.5 text-[10px] text-pink-400 font-medium">
                {owner.name}
              </span>
            )}

            {/* Type badge if not standard task */}
            {activity.type !== "task" && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase font-bold text-slate-300">
                {activity.type === "exam"
                  ? "Examen"
                  : activity.type === "meeting"
                    ? "Reunión"
                    : "Personal"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
        <button
          onClick={() => onEdit(activity)}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          title="Editar"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(activity.id)}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

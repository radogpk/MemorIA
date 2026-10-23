"use client";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import { TaskList } from "@/components/tasks/TaskList";
import { ActivityModal } from "@/components/tasks/ActivityModal";
import { Activity } from "@/types/database.types";
export default function TasksPage() {
  const {
    visibleActivities,
    subjects,
    activeProfile,
    toggleActivityStatus,
    deleteActivity,
  } = useMemoria();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const mine = subjects.filter((s) => s.profile_id === activeProfile.id);
  const selected = mine.some((s) => s.id === subject) ? subject : "";
  const activities = visibleActivities.filter(
    (a) =>
      (a.type === "task" || a.type === "exam") &&
      a.status !== "cancelled" &&
      (!selected || a.subject_id === selected) &&
      `${a.title} ${a.description || ""} ${a.subject?.name || ""}`
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es")),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Lo que queda por hacer.</h1>
          <p>
            Entregas y evaluaciones de {activeProfile.name}, ordenadas por
            fecha.
          </p>
        </div>
        <button
          className="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={18} /> Nueva actividad
        </button>
      </div>
      <div className="task-filters">
        <label>
          <Search size={18} />
          <input
            aria-label="Buscar pendientes"
            placeholder="Buscar una tarea o evaluación"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar por curso"
          value={selected}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">Todos mis cursos</option>
          {mine.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <TaskList
        activities={activities}
        onToggle={toggleActivityStatus}
        onEdit={(a) => {
          setEditing(a);
          setOpen(true);
        }}
        onDelete={(id) => {
          if (confirm("¿Eliminar esta actividad?")) deleteActivity(id);
        }}
      />
      <ActivityModal
        key={activeProfile.id}
        isOpen={open}
        onClose={() => setOpen(false)}
        initialActivity={editing}
      />
    </div>
  );
}

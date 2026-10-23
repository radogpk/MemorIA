"use client";
import { Subject } from "@/types/database.types";
export function CalendarFilterBar({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  selectedType,
  onSelectType,
}: {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (s: string | null) => void;
  selectedType: string | null;
  onSelectType: (s: string | null) => void;
}) {
  return (
    <div className="calendar-filters">
      <label>
        Mostrar
        <select
          value={selectedType || ""}
          onChange={(e) => onSelectType(e.target.value || null)}
        >
          <option value="">Todas las actividades</option>
          <option value="class">Clases y sesiones</option>
          <option value="laboratory">Solo laboratorios</option>
          <option value="exam">Exámenes</option>
          <option value="task">Tareas</option>
          <option value="meeting">Reuniones</option>
          <option value="personal">Personal</option>
        </select>
      </label>
      <label>
        Curso
        <select
          value={selectedSubjectId || ""}
          onChange={(e) => onSelectSubject(e.target.value || null)}
        >
          <option value="">Todos los cursos</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

"use client";
import { Plus, Trash2 } from "lucide-react";
import { ScheduleInput } from "@/lib/storage/store";
export interface ScheduleSlot extends ScheduleInput {
  classroom?: string;
  professor?: string;
}
export const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export const SESSION_LABELS = {
  theory: "Teoría",
  laboratory: "Laboratorio",
  practice: "Práctica",
};
export function ClassScheduleSelector({
  slots,
  onChange,
}: {
  slots: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
}) {
  const update = (i: number, data: Partial<ScheduleSlot>) =>
    onChange(slots.map((s, index) => (i === index ? { ...s, ...data } : s)));
  return (
    <section className="schedule-editor">
      <div className="section-heading">
        <h3>Sesiones del curso</h3>
        <button
          className="button secondary small"
          type="button"
          onClick={() =>
            onChange([
              ...slots,
              {
                day_of_week: 1,
                start_time: "08:00",
                end_time: "10:00",
                session_type: "theory",
                classroom: "",
                professor: "",
              },
            ])
          }
        >
          <Plus size={16} /> Añadir sesión
        </button>
      </div>
      <p className="hint">
        Añade teoría y, si corresponde, laboratorios o prácticas. Cada sesión
        tiene su propio horario, aula y docente.
      </p>
      {slots.map((s, i) => (
        <fieldset className="schedule-slot" key={i}>
          <legend>Sesión {i + 1}</legend>
          <div className="form-grid">
            <label>
              Tipo
              <select
                value={s.session_type || "theory"}
                onChange={(e) =>
                  update(i, {
                    session_type: e.target
                      .value as ScheduleSlot["session_type"],
                  })
                }
              >
                {Object.entries(SESSION_LABELS).map(([id, label]) => (
                  <option value={id} key={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Día
              <select
                value={s.day_of_week}
                onChange={(e) => update(i, { day_of_week: +e.target.value })}
              >
                {DAYS.map((d, j) => (
                  <option value={j + 1} key={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Inicio
              <input
                type="time"
                name={`slot_${i}_start`}
                required
                value={s.start_time}
                onChange={(e) => update(i, { start_time: e.target.value })}
              />
            </label>
            <label>
              Fin
              <input
                type="time"
                name={`slot_${i}_end`}
                required
                value={s.end_time}
                onChange={(e) => update(i, { end_time: e.target.value })}
              />
            </label>
            <label>
              Aula de esta sesión
              <input
                value={s.classroom || ""}
                placeholder="Usar aula del curso"
                onChange={(e) => update(i, { classroom: e.target.value })}
              />
            </label>
            <label>
              Docente de esta sesión
              <input
                value={s.professor || ""}
                placeholder={
                  s.session_type === "laboratory"
                    ? "Por confirmar"
                    : "Usar docente del curso"
                }
                onChange={(e) => update(i, { professor: e.target.value })}
              />
            </label>
          </div>
          <button
            className="text-button danger"
            type="button"
            onClick={() => onChange(slots.filter((_, j) => i !== j))}
          >
            <Trash2 size={15} /> Quitar sesión
          </button>
        </fieldset>
      ))}
      {!slots.length && (
        <p className="empty-inline">
          Puedes guardar el curso ahora y añadir sus sesiones después.
        </p>
      )}
    </section>
  );
}

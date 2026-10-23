"use client";
import { useState, useEffect } from "react";
import { Subject, CreateSubjectInput } from "@/types/database.types";
import { ClassScheduleSelector, ScheduleSlot } from "./ClassScheduleSelector";
import { validateClassScheduleSlot } from "@/lib/actions/subjects-validation";
import { useMemoria } from "@/lib/storage/store";
import { Modal } from "@/components/ui/Modal";
export function SubjectFormModal({
  isOpen,
  onClose,
  onSave,
  initialSubject,
  initialSlots = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateSubjectInput, slots: ScheduleSlot[]) => void;
  initialSubject?: Subject | null;
  initialSlots?: ScheduleSlot[];
}) {
  const { activeProfile } = useMemoria();
  const [form, setForm] = useState({
    name: "",
    code: "",
    professor: "",
    classroom: "",
    color: "#7cb8df",
  });
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: initialSubject?.name || "",
      code: initialSubject?.code || "",
      professor: initialSubject?.professor || "",
      classroom: initialSubject?.classroom || "",
      color: initialSubject?.color || "#7cb8df",
    });
    setSlots(initialSlots);
    setError("");
    // Initialize only when the editor opens or its record changes, not on polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialSubject?.id]);
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={initialSubject ? "Editar curso" : "Nuevo curso"}
      wide
    >
      <form
        className="dialog-body"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          const fields = new FormData(e.currentTarget);
          const termParts = [
            fields.get("term_name"),
            fields.get("term_start"),
            fields.get("term_end"),
          ].map((v) => String(v || "").trim());
          if (termParts.some(Boolean) && termParts.some((v) => !v)) {
            setError(
              "Completa el nombre, inicio y fin del semestre, o deja los tres campos vacíos.",
            );
            return;
          }
          const actualSlots = slots.map((s, i) => ({
            ...s,
            start_time: String(fields.get(`slot_${i}_start`) || s.start_time),
            end_time: String(fields.get(`slot_${i}_end`) || s.end_time),
          }));
          for (const slot of actualSlots) {
            const result = validateClassScheduleSlot(slot);
            if (!result.valid) {
              setError(result.error!);
              return;
            }
          }
          try {
            onSave(
              {
                name: form.name.trim(),
                code: form.code.trim() || null,
                professor: form.professor.trim() || null,
                classroom: form.classroom.trim() || null,
                color: form.color,
                is_active: initialSubject?.is_active ?? true,
                profile_id: initialSubject?.profile_id || activeProfile.id,
                holiday_policy: String(
                  fields.get("holiday_policy") || "inherit",
                ) as "inherit" | "skip" | "attend",
                term:
                  fields.get("term_start") ||
                  fields.get("term_end") ||
                  fields.get("term_name")
                    ? {
                        name: String(fields.get("term_name") || "").trim(),
                        start_date: String(fields.get("term_start") || ""),
                        end_date: String(fields.get("term_end") || ""),
                      }
                    : null,
              },
              actualSlots,
            );
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo guardar.");
          }
        }}
      >
        <p className="hint">
          Curso de {initialSubject ? "su perfil actual" : activeProfile.name}.
          Los laboratorios se guardan dentro del curso.
        </p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="form-grid">
          <label className="span-2">
            Nombre del curso
            <input
              required
              maxLength={100}
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Código
            <input
              maxLength={20}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </label>
          <label>
            Color
            <input
              aria-label="Color del curso"
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </label>
          <label>
            Docente de teoría
            <input
              maxLength={100}
              value={form.professor}
              onChange={(e) => setForm({ ...form, professor: e.target.value })}
            />
          </label>
          <label>
            Aula de teoría
            <input
              maxLength={100}
              value={form.classroom}
              onChange={(e) => setForm({ ...form, classroom: e.target.value })}
            />
          </label>
        </div>
        <fieldset
          className="academic-course"
          key={`${isOpen}:${initialSubject?.id || "new"}`}
        >
          <legend>Semestre y feriados</legend>
          <p className="hint">
            Las sesiones se repiten solo entre estas fechas. Déjalas vacías si
            el curso no tiene un semestre definido.
          </p>
          <div className="form-grid">
            <label className="span-2">
              Nombre del semestre
              <input
                name="term_name"
                maxLength={60}
                defaultValue={initialSubject?.term?.name || ""}
                placeholder="Por ejemplo, 2026-II"
              />
            </label>
            <label>
              Inicio del semestre
              <input
                name="term_start"
                type="date"
                defaultValue={initialSubject?.term?.start_date || ""}
              />
            </label>
            <label>
              Fin del semestre
              <input
                name="term_end"
                type="date"
                defaultValue={initialSubject?.term?.end_date || ""}
              />
            </label>
            <label className="span-2">
              En los feriados registrados de este perfil
              <select
                name="holiday_policy"
                defaultValue={initialSubject?.holiday_policy || "inherit"}
              >
                <option value="inherit">Usar la regla del perfil</option>
                <option value="skip">Este curso no dicta clases</option>
                <option value="attend">Este curso mantiene sus clases</option>
              </select>
            </label>
          </div>
          <p className="hint">
            Un cambio por fecha tiene prioridad. Puedes mantener un laboratorio
            aunque las demás clases se suspendan.
          </p>
        </fieldset>
        <ClassScheduleSelector slots={slots} onChange={setSlots} />
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button" type="submit">
            Guardar curso
          </button>
        </div>
      </form>
    </Modal>
  );
}

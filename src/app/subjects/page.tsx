"use client";
import { useState } from "react";
import { Plus, BookOpen, Download } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import { SubjectCard } from "@/components/subjects/SubjectCard";
import { SubjectFormModal } from "@/components/subjects/SubjectFormModal";
import { Subject } from "@/types/database.types";
export default function SubjectsPage() {
  const {
    subjects,
    recurrentClasses,
    activeProfile,
    addSubject,
    updateSubject,
    deleteSubject,
    importPreviousSchedule,
  } = useMemoria();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const mine = subjects.filter((s) => s.profile_id === activeProfile.id);
  const sessions = recurrentClasses.filter(
    (c) => c.profile_id === activeProfile.id,
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Un curso. Todas sus sesiones.</h1>
          <p>
            Teoría, laboratorios y prácticas de {activeProfile.name}, en un solo
            lugar.
          </p>
        </div>
        <button
          className="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={18} /> Nuevo curso
        </button>
      </div>
      <div className="course-summary">
        <span>{mine.length} cursos</span>
        <span>
          {sessions.filter((c) => c.session_type === "laboratory").length}{" "}
          laboratorios
        </span>
        <span>{sessions.length} sesiones por semana</span>
      </div>
      {!mine.length ? (
        <div className="empty-state large">
          <BookOpen size={32} />
          <h2>Empieza con tu primer curso</h2>
          <p>
            Añade su horario de teoría y las sesiones de laboratorio que
            correspondan.
          </p>
          <button className="button" onClick={() => setOpen(true)}>
            Añadir curso
          </button>
          <button
            className="text-button"
            onClick={() => importPreviousSchedule()}
          >
            <Download size={16} /> Recuperar horario de la versión anterior
          </button>
          <small className="hint">
            Revisa los datos precargados antes de usarlos; pueden contener
            ejemplos.
          </small>
        </div>
      ) : (
        <div className="course-list">
          {mine.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              classes={sessions.filter((c) => c.subject_id === s.id)}
              onEdit={(s) => {
                setEditing(s);
                setOpen(true);
              }}
              onDelete={deleteSubject}
            />
          ))}
        </div>
      )}
      <SubjectFormModal
        key={activeProfile.id}
        isOpen={open}
        onClose={() => setOpen(false)}
        initialSubject={editing}
        initialSlots={
          editing
            ? sessions
                .filter((c) => c.subject_id === editing.id)
                .map((c) => ({
                  ...c,
                  classroom: c.classroom || "",
                  professor: c.professor || "",
                }))
            : []
        }
        onSave={(input, slots) => {
          if (editing) updateSubject(editing.id, input, slots);
          else addSubject(input, slots);
        }}
      />
    </div>
  );
}

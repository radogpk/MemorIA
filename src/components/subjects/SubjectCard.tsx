"use client";
import { useState } from "react";
import { Pencil, Trash2, FlaskConical } from "lucide-react";
import { Subject, RecurrentClass } from "@/types/database.types";
import { DAYS, SESSION_LABELS } from "./ClassScheduleSelector";
import { SessionExceptions } from "./SessionExceptions";
export function SubjectCard({
  subject,
  classes,
  onEdit,
  onDelete,
}: {
  subject: Subject;
  classes: RecurrentClass[];
  onEdit: (s: Subject) => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <article className="course-row">
      <div className="course-identity">
        <span className="course-dot" style={{ background: subject.color }} />
        <div>
          <h2>{subject.name}</h2>
          <p>
            {[
              subject.code,
              ...(classes.length ? [] : [subject.professor, subject.classroom]),
            ]
              .filter(Boolean)
              .join(" · ") ||
              (classes.length
                ? "Horario semanal"
                : "Detalles de teoría por completar")}
          </p>
        </div>
        <div className="row-actions">
          <button
            className="icon-button"
            aria-label={`Editar ${subject.name}`}
            onClick={() => onEdit(subject)}
          >
            <Pencil size={17} />
          </button>
          <button
            className="icon-button"
            aria-label={`Eliminar ${subject.name}`}
            onClick={() => setConfirming(!confirming)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      {subject.term && (
        <p className="course-term">
          {subject.term.name} ·{" "}
          {subject.term.start_date.split("-").reverse().join("/")} al{" "}
          {subject.term.end_date.split("-").reverse().join("/")}
        </p>
      )}
      {subject.holiday_policy && subject.holiday_policy !== "inherit" && (
        <p className="hint">
          Feriados registrados:{" "}
          {subject.holiday_policy === "skip"
            ? "no se dictan clases"
            : "se mantiene el horario"}
          .
        </p>
      )}
      {confirming && (
        <div className="notice">
          <span>
            Se quitarán el curso y sus sesiones. Tus actividades se conservarán
            sin curso.
          </span>
          <button
            className="text-button danger"
            onClick={() => onDelete(subject.id)}
          >
            Eliminar curso
          </button>
          <button className="text-button" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
        </div>
      )}
      <div className="course-sessions">
        {classes
          .sort(
            (a, b) =>
              a.day_of_week - b.day_of_week ||
              a.start_time.localeCompare(b.start_time),
          )
          .map((c) => (
            <div
              className={`session-row ${c.session_type === "laboratory" ? "lab" : ""}`}
              key={c.id}
            >
              <span className="session-kind">
                {c.session_type === "laboratory" && <FlaskConical size={14} />}{" "}
                {SESSION_LABELS[c.session_type || "theory"]}
              </span>
              <strong>{DAYS[c.day_of_week - 1]}</strong>
              <time>
                {c.start_time} – {c.end_time}
              </time>
              <span>
                {c.classroom ||
                  (c.session_type === "laboratory"
                    ? null
                    : subject.classroom) ||
                  "Aula por confirmar"}
              </span>
              <span>
                {c.professor ||
                  (c.session_type === "laboratory"
                    ? "Docente por confirmar"
                    : subject.professor) ||
                  "Docente por confirmar"}
              </span>
            </div>
          ))}
        {!classes.length && (
          <p className="hint">
            Sin sesiones. Edita el curso para añadir teoría o laboratorio.
          </p>
        )}
      </div>
      <SessionExceptions classes={classes} subject={subject} />
    </article>
  );
}

"use client";
import { useEffect, useState } from "react";
import type {
  RecurrentClass,
  Subject,
  SessionException,
} from "@/types/database.types";
import { useMemoria } from "@/lib/storage/store";
import { DAYS, SESSION_LABELS } from "./ClassScheduleSelector";
import { validDay } from "@/lib/calendar/academic";

export function SessionExceptions({
  classes,
  subject,
}: {
  classes: RecurrentClass[];
  subject: Subject;
}) {
  const { updateClassExceptions } = useMemoria();
  const [id, setId] = useState(classes[0]?.id || ""),
    [date, setDate] = useState("");
  const [action, setAction] = useState<SessionException["action"]>("override");
  const [message, setMessage] = useState("");
  const session = classes.find((c) => c.id === id) || classes[0];
  const existing = session?.exceptions?.find((e) => e.date === date);
  useEffect(() => {
    setAction(existing?.action || "override");
    setMessage("");
  }, [id, date]);
  if (!session) return null;
  const changes = classes
    .flatMap((c) =>
      (c.exceptions || []).map((e) => ({ session: c, exception: e })),
    )
    .sort((a, b) => a.exception.date.localeCompare(b.exception.date));
  return (
    <details className="session-exceptions">
      <summary>
        Cambios por fecha{changes.length ? ` (${changes.length})` : ""}
      </summary>
      <p className="hint">
        Cancela una sesión o cambia su hora, aula o docente solo para esa fecha.
        «Se dicta» permite mantenerla incluso en un feriado.
      </p>
      <form
        className="exception-form"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage("");
          try {
            const fields = new FormData(event.currentTarget),
              actualDate = String(fields.get("date"));
            if (
              !validDay(actualDate) ||
              (new Date(`${actualDate}T12:00:00Z`).getUTCDay() || 7) !==
                session.day_of_week
            )
              throw new Error(
                `Elige un ${DAYS[session.day_of_week - 1].toLowerCase()} para esta sesión.`,
              );
            if (
              subject.term &&
              (actualDate < subject.term.start_date ||
                actualDate > subject.term.end_date)
            )
              throw new Error(
                "La fecha debe estar dentro del semestre del curso.",
              );
            const exception: SessionException = {
              date: actualDate,
              action,
              note: String(fields.get("note") || "").trim(),
            };
            if (action === "override")
              Object.assign(exception, {
                start_time: String(fields.get("start")),
                end_time: String(fields.get("end")),
                classroom: String(fields.get("classroom") || "").trim() || null,
                professor: String(fields.get("professor") || "").trim() || null,
              });
            updateClassExceptions(session.id, [
              ...(session.exceptions || []).filter(
                (e) => e.date !== actualDate,
              ),
              exception,
            ]);
            setMessage("Cambio registrado solo para esa fecha.");
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : "No se pudo guardar el cambio.",
            );
          }
        }}
      >
        <div className="form-grid">
          <label>
            Sesión
            <select
              value={session.id}
              onChange={(e) => {
                setId(e.target.value);
                setDate("");
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {SESSION_LABELS[c.session_type || "theory"]} ·{" "}
                  {DAYS[c.day_of_week - 1]} {c.start_time}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha del cambio
            <input
              type="date"
              name="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onInput={(e) => setDate(e.currentTarget.value)}
              min={subject.term?.start_date}
              max={subject.term?.end_date}
            />
          </label>
          <label className="span-2">
            Qué ocurre
            <select
              value={action}
              onChange={(e) =>
                setAction(e.target.value as SessionException["action"])
              }
            >
              <option value="override">Se dicta / cambiar detalles</option>
              <option value="cancel">No se dicta esa sesión</option>
            </select>
          </label>
        </div>
        {action === "override" && (
          <div className="form-grid" key={`${session.id}:${date}`}>
            <label>
              Inicio
              <input
                type="time"
                name="start"
                required
                defaultValue={existing?.start_time || session.start_time}
              />
            </label>
            <label>
              Fin
              <input
                type="time"
                name="end"
                required
                defaultValue={existing?.end_time || session.end_time}
              />
            </label>
            <label>
              Aula para esa fecha
              <input
                name="classroom"
                maxLength={100}
                defaultValue={
                  existing && "classroom" in existing
                    ? existing.classroom || ""
                    : session.classroom ||
                      (session.session_type === "laboratory"
                        ? ""
                        : subject.classroom) ||
                      ""
                }
              />
            </label>
            <label>
              Docente para esa fecha
              <input
                name="professor"
                maxLength={100}
                defaultValue={
                  existing && "professor" in existing
                    ? existing.professor || ""
                    : session.professor ||
                      (session.session_type === "laboratory"
                        ? ""
                        : subject.professor) ||
                      ""
                }
              />
            </label>
          </div>
        )}
        <label key={`note:${id}:${date}`}>
          Motivo (opcional)
          <input
            name="note"
            maxLength={300}
            defaultValue={existing?.note || ""}
            placeholder="Por ejemplo, recuperación de laboratorio"
          />
        </label>
        <div className="exception-actions">
          <button className="button secondary" disabled={!date}>
            {existing ? "Actualizar cambio" : "Guardar cambio de esta fecha"}
          </button>
          {message && (
            <p className="hint" role="status">
              {message}
            </p>
          )}
        </div>
      </form>
      {!!changes.length && (
        <ul className="dated-changes">
          {changes.map(({ session: c, exception: e }) => (
            <li key={`${c.id}:${e.date}`}>
              <div>
                <strong>
                  {e.date.split("-").reverse().join("/")} ·{" "}
                  {SESSION_LABELS[c.session_type || "theory"]}
                </strong>
                <span>
                  {e.action === "cancel"
                    ? "No se dicta"
                    : `${e.start_time || c.start_time}–${e.end_time || c.end_time} · ${e.classroom || "Aula por confirmar"}`}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
              </div>
              <button
                type="button"
                className="text-button"
                aria-label={`Quitar cambio del ${e.date} de ${SESSION_LABELS[c.session_type || "theory"]}`}
                onClick={() => {
                  try {
                    updateClassExceptions(
                      c.id,
                      (c.exceptions || []).filter(
                        (change) => change.date !== e.date,
                      ),
                    );
                    setMessage(
                      "Se vuelve a aplicar el horario semanal y la regla de feriados.",
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "No se pudo quitar el cambio.",
                    );
                  }
                }}
              >
                Quitar cambio
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

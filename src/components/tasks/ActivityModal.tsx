"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  ActivityType,
  ActivityPriority,
} from "@/types/database.types";
import { useMemoria } from "@/lib/storage/store";
import { dateTimeInput, localDateTimeToIso } from "@/lib/ai/date-parser";
import { Modal } from "@/components/ui/Modal";
export function ActivityModal({
  isOpen,
  onClose,
  initialDate,
  initialHour,
  initialActivity,
  invite = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialHour?: number;
  initialActivity?: Activity | null;
  invite?: boolean;
}) {
  const {
    subjects,
    activeProfile,
    partnerProfile,
    addActivity,
    updateActivity,
    deleteActivity,
  } = useMemoria();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ActivityType>("task");
  const [subject, setSubject] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [priority, setPriority] = useState<ActivityPriority>("medium");
  const [shared, setShared] = useState(false);
  const [needsReply, setNeedsReply] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    const d = initialDate ? new Date(initialDate) : new Date();
    if (initialHour !== undefined) d.setHours(initialHour, 0, 0, 0);
    setTitle(initialActivity?.title || "");
    setDescription(initialActivity?.description || "");
    setType(initialActivity?.type || (invite ? "personal" : "task"));
    setSubject(initialActivity?.subject_id || "");
    setStart(dateTimeInput(initialActivity?.start_datetime || d.toISOString()));
    setEnd(
      initialActivity?.end_datetime
        ? dateTimeInput(initialActivity.end_datetime)
        : "",
    );
    setPriority(initialActivity?.priority || "medium");
    setShared(!!initialActivity?.is_shared || invite);
    setNeedsReply(!!initialActivity?.invitation || invite);
    setError("");
  }, [isOpen, initialActivity?.id, initialDate, initialHour, invite]);
  const owner = initialActivity?.profile_id || activeProfile.id;
  const readOnly = !!initialActivity?.invitation && owner !== activeProfile.id;
  if (initialActivity?.invitation && !readOnly)
    return (
      <Modal open={isOpen} onClose={onClose} title="Propuesta compartida">
        <div className="dialog-body">
          <h3>{initialActivity.title}</h3>
          <p className="hint">
            Revisa las dos agendas antes de cambiar la hora. Los cambios pedirán
            una nueva confirmación.
          </p>
          <Link
            className="button"
            href={`/together/plan?edit=${initialActivity.id}`}
            onClick={onClose}
          >
            Revisar disponibilidad y editar
          </Link>
          <button className="button secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </Modal>
    );
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        initialActivity
          ? "Editar actividad"
          : invite
            ? "Proponer una cita"
            : "Nueva actividad"
      }
    >
      <form
        className="dialog-body"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          try {
            const fields = new FormData(e.currentTarget);
            const actualStart = String(fields.get("start") || start);
            const actualEnd = String(fields.get("end") || "");
            const startIso = localDateTimeToIso(actualStart);
            const endIso = actualEnd ? localDateTimeToIso(actualEnd) : null;
            if (endIso && endIso <= startIso)
              throw new Error(
                "El fin debe ser posterior al inicio. Puedes elegir otro día.",
              );
            const payload = {
              title: title.trim(),
              description: description.trim() || null,
              type,
              subject_id: shared ? null : subject || null,
              profile_id: owner,
              start_datetime: startIso,
              end_datetime: endIso,
              is_all_day: false,
              priority,
              status: initialActivity?.status || ("pending" as const),
              is_shared: shared,
              invitation:
                shared && needsReply && partnerProfile
                  ? initialActivity?.invitation || {
                      recipient_id: partnerProfile.id,
                      status: "pending" as const,
                      responded_at: null,
                    }
                  : null,
              metadata: initialActivity?.metadata || {},
            };
            if (initialActivity) updateActivity(initialActivity.id, payload);
            else addActivity(payload);
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo guardar.");
          }
        }}
      >
        <p className="hint">
          {readOnly
            ? "Esta cita fue propuesta por el otro perfil. Responde desde Invitaciones."
            : `Se guardará para ${activeProfile.name}. Hora de Perú (UTC−5).`}
        </p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <label>
          Título
          <input
            required
            maxLength={150}
            autoFocus
            disabled={readOnly}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              invite ? "Por ejemplo, cenar juntos" : "¿Qué necesitas recordar?"
            }
          />
        </label>
        <div className="form-grid">
          <label>
            Tipo
            <select
              disabled={readOnly}
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType)}
            >
              <option value="task">Tarea</option>
              <option value="exam">Examen</option>
              <option value="meeting">Reunión</option>
              <option value="personal">Personal / cita</option>
            </select>
          </label>
          <label>
            Prioridad
            <select
              disabled={readOnly}
              value={priority}
              onChange={(e) => setPriority(e.target.value as ActivityPriority)}
            >
              <option value="low">Baja</option>
              <option value="medium">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </label>
          <label>
            Inicio
            <input
              disabled={readOnly}
              required
              name="start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Fin (opcional)
            <input
              disabled={readOnly}
              name="end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        {!shared && (
          <label>
            Curso
            <select
              disabled={readOnly}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Sin curso / personal</option>
              {subjects
                .filter((s) => s.profile_id === owner)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label>
          Detalles
          <textarea
            disabled={readOnly}
            rows={2}
            maxLength={10000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {partnerProfile && !readOnly && (
          <div className="sharing-options">
            <Link
              className="text-button"
              href={`/together/plan?day=${start.slice(0, 10)}`}
              onClick={onClose}
            >
              Ver horas libres con {partnerProfile.name} y proponer un plan
            </Link>
            {initialActivity?.is_shared && (
              <>
                <label className="check-label">
                  <input
                    disabled={readOnly}
                    type="checkbox"
                    checked={shared}
                    onChange={(e) => setShared(e.target.checked)}
                  />{" "}
                  Compartir con {partnerProfile.name}
                </label>
                {shared && (
                  <label className="check-label">
                    <input
                      disabled={readOnly}
                      type="checkbox"
                      checked={needsReply}
                      onChange={(e) => setNeedsReply(e.target.checked)}
                    />{" "}
                    Pedir confirmación
                  </label>
                )}
                {shared && (
                  <p className="hint">
                    {needsReply
                      ? "Recibirá una invitación en su perfil. Entrará en su agenda cuando la acepte."
                      : "Aparecerá en ambas agendas al guardarla."}
                  </p>
                )}
              </>
            )}
          </div>
        )}
        <div className="dialog-actions">
          {initialActivity && !readOnly && (
            <button
              className="text-button danger"
              type="button"
              onClick={() => {
                if (confirm("¿Eliminar esta actividad?")) {
                  deleteActivity(initialActivity.id);
                  onClose();
                }
              }}
            >
              Eliminar
            </button>
          )}
          <button className="button secondary" type="button" onClick={onClose}>
            Cerrar
          </button>
          {!readOnly && (
            <button className="button" type="submit">
              {shared && needsReply && !initialActivity
                ? "Enviar invitación"
                : "Guardar actividad"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

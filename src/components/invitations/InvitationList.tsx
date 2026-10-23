"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, HeartHandshake } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import { sharedPlanConflicts } from "@/lib/calendar/availability";
import { dateTimeInput } from "@/lib/ai/date-parser";
import {
  isPendingInvitation,
  invitationSender,
  invitationParticipants,
} from "@/lib/storage/model";
export function InvitationList({ compact = false }: { compact?: boolean }) {
  const store = useMemoria();
  const { activities, activeProfile, profiles, respondInvitation } = store;
  const [error, setError] = useState("");
  const invitations = activities
    .filter(
      (a) =>
        a.invitation && invitationParticipants(a).includes(activeProfile.id),
    )
    .sort((a, b) => {
      const ap = isPendingInvitation(a) ? 0 : 1;
      const bp = isPendingInvitation(b) ? 0 : 1;
      return ap - bp || Date.parse(b.created_at) - Date.parse(a.created_at);
    });
  const displayed = compact
    ? invitations.filter(isPendingInvitation).slice(0, 2)
    : invitations;
  return (
    <div className="invitations-list">
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {displayed.map((a) => {
        const incoming = a.invitation!.recipient_id === activeProfile.id;
        const sender = profiles.find((p) => p.id === invitationSender(a));
        const recipient = profiles.find(
          (p) => p.id === a.invitation!.recipient_id,
        );
        const status = a.invitation!.status;
        const canReply = isPendingInvitation(a);
        let conflict = null;
        let scheduleError = "";
        try {
          conflict =
            incoming && canReply ? sharedPlanConflicts(store, a)[0] : null;
        } catch (e) {
          scheduleError =
            e instanceof Error
              ? e.message
              : "No se pudo revisar el horario. Pide una nueva propuesta.";
        }
        return (
          <article className="invitation-row" key={a.id}>
            <div className="invitation-meta">
              <span>
                {incoming
                  ? `${sender?.name || "El otro perfil"} te invita`
                  : `Invitaste a ${recipient?.name || "tu pareja"}`}
              </span>
              <span
                className={`response-state ${a.status === "cancelled" ? "declined" : status}`}
              >
                {a.status === "cancelled"
                  ? "Cancelada"
                  : a.status === "completed"
                    ? "Finalizada"
                    : status === "pending"
                      ? "Por confirmar"
                      : status === "accepted"
                        ? "Aceptada"
                        : "Rechazada"}
              </span>
            </div>
            <h3>{a.title}</h3>
            <p>
              {new Intl.DateTimeFormat("es-PE", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Lima",
              }).format(new Date(a.start_datetime))}
              {a.end_datetime && (
                <>
                  {" "}
                  –{" "}
                  {new Intl.DateTimeFormat("es-PE", {
                    ...(dateTimeInput(a.start_datetime).slice(0, 10) !==
                    dateTimeInput(a.end_datetime).slice(0, 10)
                      ? { dateStyle: "medium" as const }
                      : {}),
                    timeStyle: "short",
                    timeZone: "America/Lima",
                  }).format(new Date(a.end_datetime))}
                </>
              )}
            </p>
            {!compact && a.description && <p>{a.description}</p>}
            {a.invitation?.previous_start && (
              <p className="hint">
                Nueva hora propuesta por {sender?.name}. Antes:{" "}
                {new Intl.DateTimeFormat("es-PE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "America/Lima",
                }).format(new Date(a.invitation.previous_start))}
                .
              </p>
            )}
            {conflict && (
              <p className="notice error">
                Hay un cruce con «{conflict.period.title}» o su margen de
                traslado. Puedes proponer otra hora.
              </p>
            )}
            {scheduleError && <p className="notice error">{scheduleError}</p>}
            {incoming && canReply ? (
              <div className="invitation-actions">
                <button
                  className="button small"
                  disabled={!!conflict || !!scheduleError}
                  onClick={() => {
                    try {
                      respondInvitation(a.id, "accepted");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Reintenta.");
                    }
                  }}
                >
                  <Check size={15} /> Aceptar
                </button>
                <Link
                  className="button secondary small"
                  href={`/together/plan?counter=${a.id}`}
                >
                  Proponer otra hora
                </Link>
                <button
                  className="button secondary small"
                  onClick={() => {
                    try {
                      respondInvitation(a.id, "declined");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Reintenta.");
                    }
                  }}
                >
                  Rechazar
                </button>
              </div>
            ) : !incoming &&
              !compact &&
              a.status !== "cancelled" &&
              a.status !== "completed" ? (
              <Link
                className="text-button"
                href={`/together/plan?edit=${a.id}`}
              >
                Editar propuesta
              </Link>
            ) : null}
          </article>
        );
      })}
      {!displayed.length && (
        <div className="empty-inline">
          <HeartHandshake size={24} />
          <p>
            {compact
              ? "No hay invitaciones pendientes."
              : "Aún no hay invitaciones."}
          </p>
          <span className="hint">
            Propón una cita y espera su confirmación.
          </span>
        </div>
      )}
    </div>
  );
}

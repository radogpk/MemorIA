"use client";
import Link from "next/link";
import { CalendarDays, Clock3, MapPin, UserRound, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  agendaTitle,
  agendaKind,
  eventTime,
  durationLabel,
  eventDayKey,
} from "@/lib/calendar/presentation";
import type { CalendarEvent } from "@/lib/calendar/types";
import { useMemoria } from "@/lib/storage/store";

export function EventDetailsModal({
  event,
  onClose,
  onEdit,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
}) {
  const { activeProfile } = useMemoria();
  const own = !event?.profileId || event.profileId === activeProfile.id;
  const note = event?.sourceRecurrentClass
    ? event.sourceRecurrentClass.exceptions?.find(
        (exception) => exception.date === eventDayKey(event.start),
      )?.note
    : event?.description;
  return (
    <Modal open={!!event} onClose={onClose} title="Detalle de la agenda">
      {event && (
        <div className="dialog-body event-details">
          <span className="detail-kind">
            {agendaKind(event)}
            {event.profileName && ` de ${event.profileName}`}
          </span>
          <h3>{agendaTitle(event)}</h3>
          <dl>
            <div>
              <dt>
                <CalendarDays size={17} />
                Fecha
              </dt>
              <dd>
                {new Intl.DateTimeFormat("es-PE", {
                  timeZone: "America/Lima",
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(event.start)}
              </dd>
            </div>
            <div>
              <dt>
                <Clock3 size={17} />
                Horario
              </dt>
              <dd>
                {event.allDay
                  ? "Todo el día"
                  : `${eventTime(event.start)}${durationLabel(event) === "Entrega" ? " · entrega" : ` – ${eventTime(event.end)}`}`}
                <small>
                  {!event.allDay && durationLabel(event) !== "Entrega"
                    ? `${durationLabel(event)} · `
                    : ""}
                  Hora de Perú
                </small>
              </dd>
            </div>
            {event.sourceRecurrentClass && (
              <>
                <div>
                  <dt>
                    <MapPin size={17} />
                    Aula
                  </dt>
                  <dd>{event.classroom || "Por confirmar"}</dd>
                </div>
                <div>
                  <dt>
                    <UserRound size={17} />
                    Docente
                  </dt>
                  <dd>{event.professor || "Por confirmar"}</dd>
                </div>
              </>
            )}
          </dl>
          {note && <p className="hint">{note}</p>}
          {event.sourceActivity?.invitation ? (
            <Link
              className="button secondary"
              href="/together"
              onClick={onClose}
            >
              Ver plan compartido
            </Link>
          ) : event.sourceActivity &&
            (own || event.sourceActivity.is_shared) ? (
            <button className="button" onClick={() => onEdit(event)}>
              <Pencil size={17} />
              Editar actividad
            </button>
          ) : event.subject && own ? (
            <Link
              className="button secondary"
              href={`/subjects#course-${event.subject.id}`}
              onClick={onClose}
            >
              Ver curso y sesiones
            </Link>
          ) : (
            !own && (
              <p className="hint">
                Para modificarlo, entra al perfil de{" "}
                {event.profileName || "su propietario"}.
              </p>
            )
          )}
        </div>
      )}
    </Modal>
  );
}

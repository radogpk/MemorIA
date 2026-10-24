"use client";
import {
  Check,
  ChevronRight,
  FlaskConical,
  MapPin,
  BriefcaseBusiness,
} from "lucide-react";
import type { CalendarEvent } from "@/lib/calendar/types";
import {
  agendaKind,
  agendaTitle,
  eventTime,
  isDeadline,
} from "@/lib/calendar/presentation";

export function AgendaEventRow({
  event,
  onSelect,
  onToggleTask,
  owner,
  now = new Date(),
  highlight = false,
}: {
  event: CalendarEvent;
  onSelect: (event: CalendarEvent) => void;
  onToggleTask?: (id: string) => void;
  owner?: string;
  now?: Date;
  highlight?: boolean;
}) {
  const kind = agendaKind(event);
  const current =
    !isDeadline(event) &&
    !event.allDay &&
    event.start <= now &&
    event.end > now &&
    event.status !== "completed";
  const done = event.status === "completed";
  const completable = event.type === "task" && !!onToggleTask;
  return (
    <li
      className={`agenda-event-row ${completable ? "has-completion" : ""} ${current ? "is-current" : ""} ${done ? "is-completed" : ""} ${highlight ? "is-highlighted" : ""}`}
    >
      <button
        className="agenda-event-detail"
        onClick={() => onSelect(event)}
        aria-label={`Ver ${agendaTitle(event)}${kind !== agendaTitle(event) ? `, ${kind}` : ""}${owner ? ` de ${owner}` : ""}${event.allDay ? ", todo el día" : `, ${eventTime(event.start)}`}`}
      >
        <span className="agenda-event-time">
          <time dateTime={event.start.toISOString()}>
            {event.allDay ? "Todo" : eventTime(event.start)}
          </time>
          <span>
            {event.allDay
              ? "el día"
              : isDeadline(event)
                ? "Entrega"
                : eventTime(event.end)}
          </span>
        </span>
        <span className="agenda-event-content">
          {(kind !== "Trabajo" || owner || current) && (
            <span className="agenda-event-kind">
              {kind === "Laboratorio" ? (
                <FlaskConical size={13} />
              ) : kind !== "Trabajo" ? (
                <span
                  className="course-dot"
                  style={{
                    background: event.subject?.color || "var(--accent)",
                  }}
                />
              ) : null}
              {kind !== "Trabajo" && kind}
              {owner && <span className="agenda-owner">{owner}</span>}
              {current && <span className="agenda-now">Ahora</span>}
            </span>
          )}
          <strong
            className={kind === "Trabajo" ? "agenda-work-title" : undefined}
          >
            {kind === "Trabajo" && (
              <BriefcaseBusiness size={15} aria-hidden="true" />
            )}
            {agendaTitle(event)}
          </strong>
          {event.classroom && (
            <span className="agenda-event-room">
              <MapPin size={13} />
              {event.classroom}
            </span>
          )}
          {event.hasCollision && (
            <span className="agenda-conflict">
              Coincide con otro compromiso
            </span>
          )}
          {event.sourceActivity?.invitation?.status === "pending" && (
            <span className="agenda-pending">Por confirmar</span>
          )}
        </span>
        {!completable && (
          <ChevronRight
            className="agenda-row-chevron"
            size={16}
            aria-hidden="true"
          />
        )}
      </button>
      {completable && (
        <button
          className={`agenda-complete ${done ? "checked" : ""}`}
          aria-label={`${done ? "Marcar pendiente" : "Completar"}: ${event.title}`}
          onClick={() => onToggleTask?.(event.id)}
        >
          {done && <Check size={17} />}
        </button>
      )}
    </li>
  );
}

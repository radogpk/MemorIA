"use client";
import { CalendarEvent } from "@/lib/calendar/types";
import { useMemoria } from "@/lib/storage/store";
import { Check, MapPin, AlertTriangle } from "lucide-react";
import { eventTime, isDeadline, agendaKind } from "@/lib/calendar/presentation";
export function CalendarEventCard({
  event,
  onClick,
  onToggleComplete,
  compact = false,
}: {
  event: CalendarEvent;
  onClick?: () => void;
  onToggleComplete?: () => void;
  compact?: boolean;
}) {
  const { profiles, viewMode } = useMemoria();
  const profile = profiles.find((p) => p.id === event.profileId);
  const color = event.subject?.color || profile?.avatar_color || "#97c7e7";
  return (
    <div
      className={`calendar-event ${compact ? "compact" : ""} ${event.status === "completed" ? "completed" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{ backgroundColor: `${color}22` }}
      aria-label={`${event.title}, ${eventTime(event.start)}${event.classroom ? `, ${event.classroom}` : ""}`}
    >
      <div className="event-meta">
        <span className="course-dot" style={{ background: color }} />
        {agendaKind(event)}
        {event.hasCollision && <AlertTriangle size={12} />}
      </div>
      <strong>
        {event.sourceRecurrentClass
          ? event.subject?.name || event.title
          : event.title}
      </strong>
      {!compact && (
        <>
          <time>
            {eventTime(event.start)}
            {isDeadline(event) ? " · entrega" : ` – ${eventTime(event.end)}`}
          </time>
          {event.classroom && (
            <span className="event-room">
              <MapPin size={11} />
              {event.classroom}
            </span>
          )}
          {viewMode === "both" && (
            <small>{event.isShared ? "Compartida" : profile?.name}</small>
          )}
        </>
      )}
      {event.type === "task" && onToggleComplete && (
        <button
          className={`event-checkbox ${event.status === "completed" ? "checked" : ""}`}
          aria-label={
            event.status === "completed"
              ? "Marcar pendiente"
              : "Completar tarea"
          }
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {event.status === "completed" && <Check size={12} />}
        </button>
      )}
    </div>
  );
}

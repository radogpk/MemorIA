"use client";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendar/types";
import {
  calendarDate,
  fallsOnDay,
  sortAgenda,
} from "@/lib/calendar/presentation";
import { AgendaEventRow } from "./AgendaEventRow";

export function AgendaView({
  currentDate,
  events,
  week,
  showOwners,
  onSelectEvent,
  onToggleTask,
  onClearFilters,
  onSelectDate,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  week: boolean;
  showOwners: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  onToggleTask: (id: string) => void;
  onClearFilters?: () => void;
  onSelectDate: (date: Date) => void;
}) {
  const days = week
    ? Array.from({ length: 7 }, (_, i) =>
        addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i),
      )
    : [currentDate];
  return (
    <div
      className="calendar-agenda"
      aria-label={week ? "Agenda de la semana" : "Agenda del día"}
    >
      {days.map((day) => {
        const rows = sortAgenda(
          events.filter((event) => fallsOnDay(event, day)),
        );
        return (
          <section className="calendar-agenda-day" key={day.toISOString()}>
            <div className="agenda-day-heading">
              {week ? (
                <button onClick={() => onSelectDate(day)}>
                  {isSameDay(day, calendarDate())
                    ? "Hoy"
                    : format(day, "EEEE", { locale: es })}
                  <span>{format(day, "d 'de' MMMM", { locale: es })}</span>
                </button>
              ) : (
                <h2>
                  {isSameDay(day, calendarDate())
                    ? "Hoy"
                    : format(day, "EEEE", { locale: es })}
                  <span>{format(day, "d 'de' MMMM", { locale: es })}</span>
                </h2>
              )}
              <span>
                {rows.length
                  ? `${rows.length} ${rows.length === 1 ? "compromiso" : "compromisos"}`
                  : "Sin compromisos"}
              </span>
            </div>
            {rows.length ? (
              <ol className="agenda-events">
                {rows.map((event) => (
                  <AgendaEventRow
                    key={event.id}
                    event={event}
                    onSelect={onSelectEvent}
                    onToggleTask={onToggleTask}
                    owner={showOwners ? event.profileName : undefined}
                  />
                ))}
              </ol>
            ) : !week ? (
              <div className="agenda-empty">
                <CalendarDays size={28} />
                <h3>
                  {onClearFilters ? "No hay coincidencias" : "Sin compromisos"}
                </h3>
                <p>
                  {onClearFilters
                    ? "Prueba con otro curso o quita los filtros para ver la agenda completa."
                    : "Todavía no hay actividades para esta fecha. Usa Añadir para anotar una."}
                </p>
                {onClearFilters && (
                  <button className="button secondary" onClick={onClearFilters}>
                    Quitar filtros
                  </button>
                )}
              </div>
            ) : (
              <p className="agenda-free-day">Sin actividades en esta agenda.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

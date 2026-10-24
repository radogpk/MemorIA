import { format } from "date-fns";
import { dateTimeInput } from "@/lib/ai/date-parser";
import type { CalendarEvent } from "./types";

/** Calendar dates are wall dates; event instants always display in Peru time. */
export const calendarDate = (instant = new Date()) =>
  new Date(`${dateTimeInput(instant.toISOString()).slice(0, 10)}T12:00:00`);
export const calendarDayKey = (date: Date) => format(date, "yyyy-MM-dd");
export const eventDayKey = (instant: Date) =>
  dateTimeInput(instant.toISOString()).slice(0, 10);
export const eventTime = (instant: Date) =>
  dateTimeInput(instant.toISOString()).slice(11, 16);
export const isDeadline = (event: CalendarEvent) =>
  event.type === "task" &&
  !!event.sourceActivity &&
  !event.sourceActivity.end_datetime &&
  !event.allDay;
export function fallsOnDay(event: CalendarEvent, day: Date) {
  const key = calendarDayKey(day);
  if (isDeadline(event)) return eventDayKey(event.start) === key;
  return (
    eventDayKey(event.start) <= key &&
    eventDayKey(new Date(+event.end - 1)) >= key
  );
}
export const agendaTitle = (event: CalendarEvent) =>
  event.sourceRecurrentClass ? event.subject?.name || event.title : event.title;
export function agendaKind(event: CalendarEvent) {
  if (event.sourceRecurrentClass)
    return {
      theory: "Teoría",
      laboratory: "Laboratorio",
      practice: "Práctica",
    }[event.sourceRecurrentClass.session_type || "theory"];
  if (event.sourceActivity?.metadata?.kind === "work") return "Trabajo";
  return {
    class: "Clase",
    task: "Tarea",
    exam: "Examen",
    meeting: "Reunión",
    personal: "Personal",
  }[event.type];
}
export function durationLabel(event: CalendarEvent) {
  if (event.allDay) return "Todo el día";
  if (isDeadline(event)) return "Entrega";
  const minutes = Math.round((+event.end - +event.start) / 60000);
  return [
    Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h` : "",
    minutes % 60 ? `${minutes % 60} min` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
export const sortAgenda = (events: CalendarEvent[]) =>
  [...events].sort(
    (a, b) =>
      Number(!!b.allDay) - Number(!!a.allDay) ||
      +a.start - +b.start ||
      agendaTitle(a).localeCompare(agendaTitle(b)),
  );

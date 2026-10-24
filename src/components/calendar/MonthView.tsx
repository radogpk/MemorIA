"use client";
import {
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/calendar/types";
import {
  calendarDate,
  fallsOnDay,
  agendaTitle,
  eventTime,
} from "@/lib/calendar/presentation";
export function MonthView({
  currentDate,
  events,
  onSelectDate,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectDate: (day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  });
  return (
    <div className="month-calendar">
      <div className="month-weekdays" aria-hidden="true">
        {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="month-grid">
        {days.map((day) => {
          const daily = events.filter((event) => fallsOnDay(event, day));
          return (
            <button
              key={day.toISOString()}
              className={`month-day ${isSameDay(day, calendarDate()) ? "is-today" : ""} ${!isSameMonth(day, currentDate) ? "is-outside" : ""}`}
              aria-label={`${format(day, "EEEE d 'de' MMMM", { locale: es })}, ${daily.length} ${daily.length === 1 ? "compromiso" : "compromisos"}`}
              aria-current={isSameDay(day, calendarDate()) ? "date" : undefined}
              aria-pressed={isSameDay(day, currentDate)}
              onClick={() => onSelectDate(day)}
            >
              <span>{format(day, "d")}</span>
              {daily.length > 0 && (
                <>
                  <span className="month-dots" aria-hidden="true">
                    {daily.slice(0, 3).map((event) => (
                      <i
                        key={event.id}
                        style={{
                          background: event.subject?.color || "var(--accent)",
                        }}
                      />
                    ))}
                  </span>
                  <span className="month-count">{daily.length}</span>
                  <span className="month-event-titles">
                    {daily.slice(0, 2).map((event) => (
                      <span key={event.id}>
                        {eventTime(event.start)} {agendaTitle(event)}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <p className="month-hint">Toca un día para ver su agenda completa.</p>
    </div>
  );
}

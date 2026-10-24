"use client";

import React from "react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarEvent } from "@/lib/calendar/types";
import { CalendarEventCard } from "./CalendarEventCard";
import { layoutTimedEvents } from "@/lib/calendar/layout";
import { eventTime, calendarDate } from "@/lib/calendar/presentation";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void;
  onToggleTask: (id: string) => void;
}

const HOUR_HEIGHT_PX = 70; // Slightly taller for Day view

export function DayView({
  currentDate,
  events,
  onSelectEvent,
  onSlotClick,
  onToggleTask,
}: Props) {
  const START_HOUR = Math.min(
    7,
    ...events.map((e) => Number(eventTime(e.start).slice(0, 2))),
  );
  const END_HOUR = Math.max(
    22,
    ...events.map((e) => Number(eventTime(e.start).slice(0, 2))),
  );
  const TOTAL_HOURS = END_HOUR - START_HOUR + 1;
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  const getEventPositionStyle = (event: CalendarEvent) => {
    const startHour = Number(eventTime(event.start).slice(0, 2));
    const startMinutes = Number(eventTime(event.start).slice(3, 5));

    const topMinutes = Math.max(
      0,
      (startHour - START_HOUR) * 60 + startMinutes,
    );
    const durationMinutes = Math.max(
      30,
      Math.min(
        (event.end.getTime() - event.start.getTime()) / 60000,
        (24 - startHour) * 60 - startMinutes,
      ),
    );

    const topPx = (topMinutes / 60) * HOUR_HEIGHT_PX;
    const heightPx = Math.max(34, (durationMinutes / 60) * HOUR_HEIGHT_PX - 2);

    return {
      top: `${topPx}px`,
      height: `${heightPx}px`,
    };
  };

  const eventLayout = layoutTimedEvents(events);
  const formattedDay = format(currentDate, "EEEE, d 'de' MMMM", { locale: es });

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#090d16]">
      <div className="border-b border-slate-800 bg-[#0c121e] px-4 py-2.5">
        <h3 className="text-sm font-semibold capitalize text-white">
          {formattedDay}{" "}
          {isSameDay(currentDate, calendarDate()) && (
            <span className="text-blue-400 font-bold ml-2">(Hoy)</span>
          )}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="grid grid-cols-12 relative"
          style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT_PX}px` }}
        >
          {/* Time column */}
          <div className="col-span-2 sm:col-span-1 border-r border-slate-800/80 bg-[#0a0f1a]/50 text-right pr-2">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                className="border-b border-slate-800/40 text-[11px] font-mono text-slate-500 pt-1"
              >
                {hour.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Main events column */}
          <div className="col-span-10 sm:col-span-11 relative">
            {hours.map((hour) => (
              <div
                key={hour}
                role="button"
                tabIndex={0}
                aria-label={`Crear actividad a las ${hour}:00`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSlotClick(currentDate, hour);
                  }
                }}
                onClick={() => onSlotClick(currentDate, hour)}
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                className="border-b border-slate-800/30 hover:bg-slate-800/20 cursor-pointer transition"
                title={`Crear evento a las ${hour}:00`}
              />
            ))}

            {events.map((event) => {
              const posStyle = getEventPositionStyle(event);
              return (
                <div
                  key={event.id}
                  style={{
                    ...posStyle,
                    left: `calc(${((eventLayout.get(event.id)?.column || 0) * 100) / (eventLayout.get(event.id)?.columns || 1)}% + 3px)`,
                    width: `calc(${100 / (eventLayout.get(event.id)?.columns || 1)}% - 6px)`,
                  }}
                  className="absolute left-2 right-4 z-10"
                >
                  <CalendarEventCard
                    event={event}
                    onClick={() => onSelectEvent(event)}
                    onToggleComplete={
                      event.sourceActivity
                        ? () => onToggleTask(event.sourceActivity!.id)
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

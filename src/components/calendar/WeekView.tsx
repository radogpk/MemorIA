"use client";

import React from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarEvent } from "@/lib/calendar/types";
import { CalendarEventCard } from "./CalendarEventCard";
import { layoutTimedEvents } from "@/lib/calendar/layout";
import {
  eventTime,
  fallsOnDay,
  calendarDate,
} from "@/lib/calendar/presentation";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void;
  onToggleTask: (id: string) => void;
}

const HOUR_HEIGHT_PX = 60; // 60px per hour

export function WeekView({
  currentDate,
  events,
  onSelectEvent,
  onSlotClick,
  onToggleTask,
}: Props) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

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

  // Position calculation
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
    const heightPx = Math.max(28, (durationMinutes / 60) * HOUR_HEIGHT_PX - 2);

    return {
      top: `${topPx}px`,
      height: `${heightPx}px`,
    };
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#090d16]">
      {/* Week days header */}
      <div
        className="grid border-b border-slate-800 bg-[#0c121e] text-xs font-semibold"
        style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
      >
        {/* Time column header */}
        <div className="border-r border-slate-800/80 p-2 text-center text-slate-500 text-[11px]">
          GMT-5
        </div>

        {/* 7 Days headers */}
        {days.map((day) => {
          const isCurrent = isSameDay(day, calendarDate());
          const dayName = format(day, "EEE", { locale: es }).toUpperCase();
          const dayNumber = format(day, "d");

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-slate-800/80 p-2 text-center transition ${
                isCurrent ? "bg-blue-600/10 text-blue-400" : "text-slate-400"
              }`}
            >
              <div className="text-[10px] font-medium tracking-wider">
                {dayName}
              </div>
              <div
                className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent ? "bg-blue-600 text-white" : "text-slate-200"
                }`}
              >
                {dayNumber}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hourly Scrollable Grid */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="grid relative"
          style={{
            height: `${TOTAL_HOURS * HOUR_HEIGHT_PX}px`,
            gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))",
          }}
        >
          {/* Time scale column */}
          <div className="border-r border-slate-800/80 bg-[#0a0f1a]/50 text-right pr-2">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                className="border-b border-slate-800/40 text-[10px] font-mono text-slate-500 pt-1"
              >
                {hour.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* 7 Day Columns with Events */}
          {days.map((day) => {
            const isCurrent = isSameDay(day, calendarDate());
            const dayEvents = events.filter((e) => fallsOnDay(e, day));
            const eventLayout = layoutTimedEvents(dayEvents);

            return (
              <div
                key={day.toISOString()}
                className={`relative border-r border-slate-800/60 ${
                  isCurrent ? "bg-blue-950/10" : ""
                }`}
              >
                {/* Horizontal hour grid lines for clicking */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    role="button"
                    tabIndex={0}
                    aria-label={`Crear actividad el ${format(day, "dd/MM")} a las ${hour}:00`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSlotClick(day, hour);
                      }
                    }}
                    onClick={() => onSlotClick(day, hour)}
                    style={{ height: `${HOUR_HEIGHT_PX}px` }}
                    className="border-b border-slate-800/30 hover:bg-slate-800/20 cursor-pointer transition"
                    title={`Crear evento el ${format(day, "dd/MM")} a las ${hour}:00`}
                  />
                ))}

                {/* Render Events */}
                {dayEvents.map((event) => {
                  const posStyle = getEventPositionStyle(event);
                  return (
                    <div
                      key={event.id}
                      style={{
                        ...posStyle,
                        left: `calc(${((eventLayout.get(event.id)?.column || 0) * 100) / (eventLayout.get(event.id)?.columns || 1)}% + 3px)`,
                        width: `calc(${100 / (eventLayout.get(event.id)?.columns || 1)}% - 6px)`,
                      }}
                      className="absolute left-1 right-1 z-10"
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

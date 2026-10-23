"use client";

import React from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarEvent } from "@/lib/calendar/types";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function MonthView({
  currentDate,
  events,
  onSelectDate,
  onSelectEvent,
}: Props) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#090d16]">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-[#0c121e] text-center text-xs font-semibold text-slate-400 py-2">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isCurrentDay = isToday(day);
          const dayEvents = events.filter((e) => isSameDay(e.start, day));

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`min-h-[90px] border-b border-r border-slate-800/60 p-1.5 transition cursor-pointer hover:bg-slate-800/30 flex flex-col ${
                !isCurrentMonth ? "opacity-30 bg-[#080b12]" : ""
              } ${isCurrentDay ? "bg-blue-950/20" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrentDay
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-300"
                  }`}
                >
                  {format(day, "d")}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    {dayEvents.length} {dayEvents.length === 1 ? "act" : "acts"}
                  </span>
                )}
              </div>

              {/* Event chips */}
              <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                {dayEvents.slice(0, 3).map((event) => {
                  const subjectColor = event.subject?.color || "#3b82f6";
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight text-white transition hover:brightness-125"
                      style={{
                        backgroundColor:
                          event.type === "exam"
                            ? "#ef4444"
                            : event.type === "task"
                              ? "#d97706"
                              : subjectColor,
                      }}
                      title={`${event.title} (${format(event.start, "HH:mm")})`}
                    >
                      {format(event.start, "HH:mm")} {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] font-semibold text-slate-400 pl-1">
                    +{dayEvents.length - 3} más...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

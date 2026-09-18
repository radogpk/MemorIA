'use client';

import React from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarEvent } from '@/lib/calendar/types';
import { CalendarEventCard } from './CalendarEventCard';

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void;
  onToggleTask: (id: string) => void;
}

const START_HOUR = 7; // 07:00 AM
const END_HOUR = 22;  // 10:00 PM
const TOTAL_HOURS = END_HOUR - START_HOUR + 1;
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

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  // Position calculation
  const getEventPositionStyle = (event: CalendarEvent) => {
    const startHour = event.start.getHours();
    const startMinutes = event.start.getMinutes();
    const endHour = event.end.getHours();
    const endMinutes = event.end.getMinutes();

    const topMinutes = Math.max(0, (startHour - START_HOUR) * 60 + startMinutes);
    const durationMinutes = Math.max(
      30,
      (endHour - startHour) * 60 + (endMinutes - startMinutes)
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
      <div className="grid grid-cols-8 border-b border-slate-800 bg-[#0c121e] text-xs font-semibold">
        {/* Time column header */}
        <div className="border-r border-slate-800/80 p-2 text-center text-slate-500 text-[11px]">
          GMT-5
        </div>

        {/* 7 Days headers */}
        {days.map((day) => {
          const isCurrent = isToday(day);
          const dayName = format(day, 'EEE', { locale: es }).toUpperCase();
          const dayNumber = format(day, 'd');

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-slate-800/80 p-2 text-center transition ${
                isCurrent ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400'
              }`}
            >
              <div className="text-[10px] font-medium tracking-wider">{dayName}</div>
              <div
                className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent ? 'bg-blue-600 text-white' : 'text-slate-200'
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
        <div className="grid grid-cols-8 relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT_PX}px` }}>
          {/* Time scale column */}
          <div className="border-r border-slate-800/80 bg-[#0a0f1a]/50 text-right pr-2">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                className="border-b border-slate-800/40 text-[10px] font-mono text-slate-500 pt-1"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* 7 Day Columns with Events */}
          {days.map((day) => {
            const isCurrent = isToday(day);
            const dayEvents = events.filter((e) => isSameDay(e.start, day));

            return (
              <div
                key={day.toISOString()}
                className={`relative border-r border-slate-800/60 ${
                  isCurrent ? 'bg-blue-950/10' : ''
                }`}
              >
                {/* Horizontal hour grid lines for clicking */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => onSlotClick(day, hour)}
                    style={{ height: `${HOUR_HEIGHT_PX}px` }}
                    className="border-b border-slate-800/30 hover:bg-slate-800/20 cursor-pointer transition"
                    title={`Crear evento el ${format(day, 'dd/MM')} a las ${hour}:00`}
                  />
                ))}

                {/* Render Events */}
                {dayEvents.map((event) => {
                  const posStyle = getEventPositionStyle(event);
                  return (
                    <div
                      key={event.id}
                      style={posStyle}
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

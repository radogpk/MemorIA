import { CalendarEvent } from './types';
import { isSameDay, isWithinInterval, isAfter, differenceInMinutes, format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DailyStatusInfo {
  currentEvent: CalendarEvent | null;
  nextEvent: CalendarEvent | null;
  minutesToNextEvent: number | null;
  todayEvents: CalendarEvent[];
  isLunchTime: boolean;
  tasksDoneToday: number;
  totalTasksToday: number;
}

export function calculateDailyStatus(
  todayEvents: CalendarEvent[],
  now: Date = new Date()
): DailyStatusInfo {
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const timeInMinutes = currentHour * 60 + currentMinutes;

  // Lunch time between 13:00 and 14:00 (780 to 840 mins)
  const isLunchTime = timeInMinutes >= 13 * 60 && timeInMinutes < 14 * 60;

  // Filter only today's events sorted by start
  const sortedToday = todayEvents
    .filter((e) => isSameDay(e.start, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let currentEvent: CalendarEvent | null = null;
  let nextEvent: CalendarEvent | null = null;
  let minutesToNextEvent: number | null = null;

  for (const event of sortedToday) {
    // Check if event is currently happening
    if (now >= event.start && now <= event.end) {
      currentEvent = event;
    } else if (now < event.start && !nextEvent) {
      nextEvent = event;
      minutesToNextEvent = differenceInMinutes(event.start, now);
    }
  }

  // Calculate task completion ratio for today
  const todayTasks = sortedToday.filter((e) => e.type === 'task' || e.type === 'exam');
  const tasksDoneToday = todayTasks.filter((t) => t.status === 'completed').length;

  return {
    currentEvent,
    nextEvent,
    minutesToNextEvent,
    todayEvents: sortedToday,
    isLunchTime,
    tasksDoneToday,
    totalTasksToday: todayTasks.length,
  };
}

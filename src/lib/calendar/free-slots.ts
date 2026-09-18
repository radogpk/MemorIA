import { CalendarEvent } from './types';
import { isSameDay, startOfDay, addMinutes, differenceInMinutes, areIntervalsOverlapping } from 'date-fns';

export interface FreeStudySlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

/**
 * Searches for free slots on a given day between startHour (default 08:00) and endHour (default 21:00)
 * that do not intersect with any busyEvents.
 */
export function findSmartStudySlots(
  day: Date,
  busyEvents: CalendarEvent[],
  minDurationMinutes: number = 60,
  startHour: number = 8,
  endHour: number = 21
): FreeStudySlot[] {
  // Day boundaries
  const dayStart = startOfDay(day);
  const searchStart = new Date(dayStart);
  searchStart.setHours(startHour, 0, 0, 0);

  const searchEnd = new Date(dayStart);
  searchEnd.setHours(endHour, 0, 0, 0);

  // Filter busy events on this day and sort by start time
  const dayBusy = busyEvents
    .filter((e) => isSameDay(e.start, day))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const freeSlots: FreeStudySlot[] = [];
  let pointer = new Date(searchStart);

  for (const event of dayBusy) {
    // If event is completely before our pointer or starts before searchStart
    if (event.end <= pointer) {
      continue;
    }

    // If event starts after searchEnd, we stop
    if (event.start >= searchEnd) {
      break;
    }

    // Check if there is a gap between current pointer and event start
    const gapStart = new Date(Math.max(pointer.getTime(), searchStart.getTime()));
    const gapEnd = new Date(Math.min(event.start.getTime(), searchEnd.getTime()));

    const gapMinutes = differenceInMinutes(gapEnd, gapStart);

    if (gapMinutes >= minDurationMinutes) {
      freeSlots.push({
        start: gapStart,
        end: gapEnd,
        durationMinutes: gapMinutes,
      });
    }

    // Move pointer forward to the end of this busy event
    if (event.end > pointer) {
      pointer = new Date(event.end);
    }
  }

  // Check remaining gap from pointer to searchEnd
  if (pointer < searchEnd) {
    const remainingMinutes = differenceInMinutes(searchEnd, pointer);
    if (remainingMinutes >= minDurationMinutes) {
      freeSlots.push({
        start: new Date(pointer),
        end: searchEnd,
        durationMinutes: remainingMinutes,
      });
    }
  }

  return freeSlots;
}

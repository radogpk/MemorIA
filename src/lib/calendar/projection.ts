import {
  addDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameDay,
  areIntervalsOverlapping,
} from 'date-fns';
import { RecurrentClass, Activity } from '@/types/database.types';
import { CalendarEvent } from './types';

/**
 * Projects recurring classes into concrete dates within a given date range.
 * day_of_week mapping: 1 = Monday, 2 = Tuesday, ... 7 = Sunday
 */
export function projectRecurrentClassesForRange(
  recurrentClasses: RecurrentClass[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const daysInRange = eachDayOfInterval({
    start: startOfDay(rangeStart),
    end: endOfDay(rangeEnd),
  });

  const projectedEvents: CalendarEvent[] = [];

  for (const day of daysInRange) {
    // In JS Date, getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    const jsDay = day.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const matchingClasses = recurrentClasses.filter((c) => c.day_of_week === dayOfWeek);

    for (const rc of matchingClasses) {
      const [startH, startM] = rc.start_time.split(':').map(Number);
      const [endH, endM] = rc.end_time.split(':').map(Number);

      const eventStart = new Date(day);
      eventStart.setHours(startH, startM, 0, 0);

      const eventEnd = new Date(day);
      eventEnd.setHours(endH, endM, 0, 0);

      const subjectName = rc.subject?.name || 'Clase';
      const color = rc.subject?.color || '#3b82f6';

      projectedEvents.push({
        id: `class-${rc.id}-${day.toISOString().slice(0, 10)}`,
        title: subjectName,
        description: rc.classroom ? `Aula: ${rc.classroom}` : undefined,
        start: eventStart,
        end: eventEnd,
        allDay: false,
        type: 'class',
        subject: rc.subject,
        classroom: rc.classroom || rc.subject?.classroom || null,
        professor: rc.subject?.professor || null,
        isRecurrent: true,
        sourceRecurrentClass: rc,
        profileId: rc.profile_id || rc.subject?.profile_id || null,
      });
    }
  }

  return projectedEvents;
}

export interface CollisionInfo {
  collidedWithIds: string[];
  collidedWithNames: string[];
}

/**
 * Detects overlapping time slots between activities and classes or other activities.
 */
export function detectCollisions(
  activities: Activity[],
  projectedClasses: CalendarEvent[]
): Record<string, CollisionInfo> {
  const collisions: Record<string, CollisionInfo> = {};

  for (const activity of activities) {
    if (activity.is_all_day || !activity.end_datetime) {
      continue;
    }

    const actInterval = {
      start: new Date(activity.start_datetime),
      end: new Date(activity.end_datetime),
    };

    // Check collision with projected classes
    for (const pClass of projectedClasses) {
      const classInterval = {
        start: pClass.start,
        end: pClass.end,
      };

      if (areIntervalsOverlapping(actInterval, classInterval)) {
        if (!collisions[activity.id]) {
          collisions[activity.id] = {
            collidedWithIds: [],
            collidedWithNames: [],
          };
        }
        collisions[activity.id].collidedWithIds.push(pClass.id);
        collisions[activity.id].collidedWithNames.push(pClass.title);
      }
    }
  }

  return collisions;
}

/**
 * Converts activities from Supabase format to standard CalendarEvent objects.
 */
export function formatActivitiesToCalendarEvents(
  activities: Activity[],
  collisions: Record<string, CollisionInfo> = {}
): CalendarEvent[] {
  return activities.map((act) => {
    const start = new Date(act.start_datetime);
    // If end_datetime is null, default to 1 hour after start or same time
    const end = act.end_datetime
      ? new Date(act.end_datetime)
      : new Date(start.getTime() + 60 * 60 * 1000);

    const collision = collisions[act.id];

    return {
      id: act.id,
      title: act.title,
      description: act.description,
      start,
      end,
      allDay: act.is_all_day,
      type: act.type,
      status: act.status,
      priority: act.priority,
      subject: act.subject,
      sourceActivity: act,
      hasCollision: !!collision,
      collisionWith: collision?.collidedWithNames,
      profileId: act.profile_id || null,
      isShared: act.is_shared,
    };
  });
}

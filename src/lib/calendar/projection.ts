import {
  addDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameDay,
  areIntervalsOverlapping,
  format,
} from "date-fns";
import { RecurrentClass, Activity, UserProfile } from "@/types/database.types";
import { CalendarEvent } from "./types";
import { classOccurrence } from "./academic";
import { localDateTimeToIso } from "@/lib/ai/date-parser";

/**
 * Projects recurring classes into concrete dates within a given date range.
 * day_of_week mapping: 1 = Monday, 2 = Tuesday, ... 7 = Sunday
 */
export function projectRecurrentClassesForRange(
  recurrentClasses: RecurrentClass[],
  rangeStart: Date,
  rangeEnd: Date,
  profiles: UserProfile[] = [],
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

    const matchingClasses = recurrentClasses.filter(
      (c) => c.day_of_week === dayOfWeek && c.subject?.is_active !== false,
    );

    for (const rc of matchingClasses) {
      const dayKey = format(day, "yyyy-MM-dd");
      const occurrence = classOccurrence(
        rc,
        dayKey,
        profiles.find(
          (p) => p.id === (rc.profile_id || rc.subject?.profile_id),
        ),
      );
      if (!occurrence) continue;
      const [startH, startM] = occurrence.start_time.split(":").map(Number);
      const [endH, endM] = occurrence.end_time.split(":").map(Number);

      const eventStart = new Date(
        localDateTimeToIso(`${dayKey}T${occurrence.start_time.slice(0, 5)}`),
      );
      const eventEnd = new Date(
        localDateTimeToIso(`${dayKey}T${occurrence.end_time.slice(0, 5)}`),
      );

      const subjectName = rc.subject?.name || "Clase";
      const color = rc.subject?.color || "#3b82f6";

      projectedEvents.push({
        id: `class-${rc.id}-${dayKey}`,
        title:
          rc.session_type === "laboratory"
            ? `${subjectName} · Laboratorio`
            : rc.session_type === "practice"
              ? `${subjectName} · Práctica`
              : subjectName,
        description:
          [
            occurrence.classroom ? `Aula: ${occurrence.classroom}` : "",
            rc.exceptions?.find((e) => e.date === dayKey)?.note,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
        start: eventStart,
        end: eventEnd,
        allDay: false,
        type: "class",
        subject: rc.subject,
        classroom: occurrence.classroom,
        professor: occurrence.professor,
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
  projectedClasses: CalendarEvent[],
): Record<string, CollisionInfo> {
  const collisions: Record<string, CollisionInfo> = {};

  for (const activity of activities) {
    if (
      activity.status === "cancelled" ||
      activity.status === "completed" ||
      activity.is_all_day ||
      !activity.end_datetime
    ) {
      continue;
    }

    const actInterval = {
      start: new Date(activity.start_datetime),
      end: new Date(activity.end_datetime),
    };

    // Check collision with projected classes
    for (const pClass of projectedClasses) {
      if (
        (!activity.is_shared ||
          (activity.invitation && activity.invitation.status !== "accepted")) &&
        activity.profile_id &&
        pClass.profileId &&
        activity.profile_id !== pClass.profileId
      )
        continue;
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
  collisions: Record<string, CollisionInfo> = {},
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

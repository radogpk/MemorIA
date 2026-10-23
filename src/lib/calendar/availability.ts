import type { Activity } from "@/types/database.types";
import type { Snapshot } from "@/lib/storage/model";
import { dateTimeInput, localDateTimeToIso } from "@/lib/ai/date-parser";
import { invitationParticipants } from "@/lib/storage/model";
import { classOccurrence, profileSchedule } from "./academic";

export interface BusyPeriod {
  id: string;
  title: string;
  start: number;
  end: number;
  tentative: boolean;
  detail?: string;
  eventStart?: number;
  eventEnd?: number;
  travelMinutes?: number;
}
export interface FreeWindow {
  start: number;
  end: number;
}
const minute = 60_000;
export function shiftDay(day: string, offset: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export const dayStart = (day: string) =>
  Date.parse(localDateTimeToIso(`${day}T00:00`));
export const timeLabel = (instant: number) =>
  dateTimeInput(new Date(instant).toISOString()).slice(11, 16);
export const overlaps = (a: FreeWindow, b: FreeWindow) =>
  a.start < b.end && b.start < a.end;
function activityPeriod(a: Activity): FreeWindow | null {
  if (!a.is_all_day && !a.end_datetime && a.type === "task") return null;
  const start = a.is_all_day
    ? dayStart(dateTimeInput(a.start_datetime).slice(0, 10))
    : Date.parse(a.start_datetime);
  const end = a.end_datetime
    ? Date.parse(a.end_datetime)
    : start + (a.is_all_day ? 24 * 60 : 60) * minute;
  return { start, end };
}

/** All availability is calculated in Lima, including on a UTC server. Pending
 * invitations reserve both calendars until accepted, declined or cancelled. */
export function busyForDay(
  snapshot: Snapshot,
  day: string,
  profileId: string,
  excludeId?: string,
): BusyPeriod[] {
  const start = dayStart(day),
    end = dayStart(shiftDay(day, 1));
  const periods: BusyPeriod[] = [];
  const profile = snapshot.profiles.find((p) => p.id === profileId);
  const travel = profileSchedule(profile).travel_minutes;
  function add(period: BusyPeriod, withTravel = true) {
    const padding = withTravel ? travel * minute : 0;
    if (period.start - padding >= end || period.end + padding <= start) return;
    const onlyTravel = period.end <= start || period.start >= end;
    periods.push({
      ...period,
      title: onlyTravel ? `Traslado · ${period.title}` : period.title,
      eventStart: onlyTravel ? undefined : Math.max(start, period.start),
      eventEnd: onlyTravel ? undefined : Math.min(end, period.end),
      start: Math.max(start, period.start - padding),
      end: Math.min(end, period.end + padding),
      ...(padding ? { travelMinutes: travel } : {}),
    });
  }
  for (const c of snapshot.recurrentClasses) {
    const subject = snapshot.subjects.find((s) => s.id === c.subject_id);
    if (!subject || !subject.is_active || subject.profile_id !== profileId)
      continue;
    const kind =
      c.session_type === "laboratory"
        ? "Laboratorio"
        : c.session_type === "practice"
          ? "Práctica"
          : "Teoría";
    for (const classDay of travel
      ? [shiftDay(day, -1), day, shiftDay(day, 1)]
      : [day]) {
      const occurrence = classOccurrence(c, classDay, profile, subject);
      if (!occurrence) continue;
      add({
        id: `${c.id}:${classDay}`,
        title: subject.name,
        detail: [kind, occurrence.classroom].filter(Boolean).join(" · "),
        start: Date.parse(
          localDateTimeToIso(
            `${classDay}T${occurrence.start_time.slice(0, 5)}`,
          ),
        ),
        end: Date.parse(
          localDateTimeToIso(`${classDay}T${occurrence.end_time.slice(0, 5)}`),
        ),
        tentative: false,
      });
    }
  }
  for (const a of snapshot.activities) {
    if (
      a.id === excludeId ||
      a.status === "cancelled" ||
      a.status === "completed" ||
      a.invitation?.status === "declined"
    )
      continue;
    const belongs =
      a.profile_id === profileId ||
      (a.invitation
        ? invitationParticipants(a).includes(profileId)
        : a.is_shared);
    if (!belongs) continue;
    // A task deadline without duration is a reminder, not an occupied hour.
    const interval = activityPeriod(a);
    if (!interval) continue;
    const { start: aStart, end: aEnd } = interval;
    add(
      {
        id: a.id,
        title: a.title,
        start: aStart,
        end: aEnd,
        tentative: a.invitation?.status === "pending",
        detail: a.is_all_day
          ? "Todo el día"
          : !a.end_datetime
            ? "Duración estimada: 1 h"
            : undefined,
      },
      !a.is_all_day,
    );
  }
  return periods.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function commonFreeWindows(
  busy: BusyPeriod[],
  start: number,
  end: number,
  duration: number,
): FreeWindow[] {
  const windows: FreeWindow[] = [];
  let cursor = start;
  for (const period of [...busy].sort((a, b) => a.start - b.start)) {
    if (period.end <= cursor || period.start >= end) continue;
    if (period.start - cursor >= duration * minute)
      windows.push({ start: cursor, end: Math.min(period.start, end) });
    cursor = Math.max(cursor, period.end);
  }
  if (end - cursor >= duration * minute) windows.push({ start: cursor, end });
  return windows;
}

export function suggestedStarts(
  windows: FreeWindow[],
  duration: number,
): number[] {
  return windows.flatMap((window) => {
    const starts: number[] = [];
    // Align to Lima's quarter-hours, not the browser timezone.
    for (
      let start = Math.ceil(window.start / (15 * minute)) * 15 * minute;
      start + duration * minute <= window.end;
      start += 30 * minute
    )
      starts.push(start);
    return starts;
  });
}

/** Used again inside the database transaction when sending or accepting. */
export function sharedPlanConflicts(
  snapshot: Snapshot,
  plan: Activity,
): { profileId: string; period: BusyPeriod }[] {
  if (!plan.is_shared && !plan.invitation) return [];
  if (
    plan.status === "cancelled" ||
    plan.status === "completed" ||
    plan.invitation?.status === "declined"
  )
    return [];
  const interval = activityPeriod(plan);
  if (!interval) return [];
  const { start, end } = interval;
  const days: string[] = [];
  let day = dateTimeInput(new Date(start).toISOString()).slice(0, 10);
  const last = dateTimeInput(new Date(end - 1).toISOString()).slice(0, 10);
  // Shared plans are bounded to avoid unbounded work on malformed imports.
  if ((end - start) / minute > 7 * 24 * 60)
    throw new Error("Un plan compartido puede durar hasta 7 días.");
  while (day <= last) {
    days.push(day);
    day = shiftDay(day, 1);
  }
  const ids = plan.invitation
    ? invitationParticipants(plan)
    : snapshot.profiles.map((p) => p.id);
  return ids.flatMap((profileId) =>
    days.flatMap((d) =>
      busyForDay(snapshot, d, profileId, plan.id)
        .filter((period) => overlaps({ start, end }, period))
        .map((period) => ({ profileId, period })),
    ),
  );
}

import type {
  RecurrentClass,
  Subject,
  UserProfile,
} from "@/types/database.types";
import { GERARDO_PROFILE_ID } from "@/lib/supabase/data";

export function validDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export const profileSchedule = (profile?: UserProfile) =>
  profile?.schedule || {
    holiday_policy:
      profile?.id === GERARDO_PROFILE_ID
        ? ("skip" as const)
        : ("attend" as const),
    holidays: [],
    travel_minutes: 0,
  };

/** One occurrence definition is shared by the calendar, availability and export. */
export function classOccurrence(
  rc: RecurrentClass,
  day: string,
  profile?: UserProfile,
  course = rc.subject,
): RecurrentClass | null {
  if (
    !validDay(day) ||
    course?.is_active === false ||
    (new Date(`${day}T12:00:00Z`).getUTCDay() || 7) !== rc.day_of_week
  )
    return null;
  if (
    course?.term &&
    (day < course.term.start_date || day > course.term.end_date)
  )
    return null;
  const exception = rc.exceptions?.find((e) => e.date === day);
  if (exception?.action === "cancel") return null;
  const schedule = profileSchedule(profile);
  const policy =
    course?.holiday_policy && course.holiday_policy !== "inherit"
      ? course.holiday_policy
      : schedule.holiday_policy;
  if (
    !exception &&
    policy === "skip" &&
    schedule.holidays.some((h) => h.date === day)
  )
    return null;
  const laboratory = rc.session_type === "laboratory";
  return {
    ...rc,
    start_time: exception?.start_time || rc.start_time,
    end_time: exception?.end_time || rc.end_time,
    classroom:
      exception && "classroom" in exception
        ? exception.classroom!
        : rc.classroom || (laboratory ? null : course?.classroom) || null,
    professor:
      exception && "professor" in exception
        ? exception.professor!
        : rc.professor || (laboratory ? null : course?.professor) || null,
    subject: course,
  };
}

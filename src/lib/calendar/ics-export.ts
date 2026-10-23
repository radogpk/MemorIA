import {
  Subject,
  RecurrentClass,
  Activity,
  UserProfile,
} from "@/types/database.types";
import { dateTimeInput, localDateTimeToIso } from "@/lib/ai/date-parser";
import { shiftDay } from "./availability";
import { classOccurrence, profileSchedule } from "./academic";

const DAY_CODES: Record<number, string> = {
  1: "MO",
  2: "TU",
  3: "WE",
  4: "TH",
  5: "FR",
  6: "SA",
  7: "SU",
};

function formatIcsDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// RFC 5545 limits a physical content line to 75 UTF-8 octets. Folding must
// preserve complete code points, including accented names and emoji.
function foldLine(value: string): string {
  const encoder = new TextEncoder();
  const result: string[] = [];
  let line = "",
    length = 0;
  for (const character of value) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) {
      result.push(line);
      line = " ";
      length = 1;
    }
    line += character;
    length += bytes;
  }
  result.push(line);
  return result.join("\r\n");
}

export function generateIcsCalendarContent(
  subjects: Subject[],
  recurrentClasses: RecurrentClass[],
  activities: Activity[],
  referenceDate = new Date(),
  profiles: UserProfile[] = [],
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//memorIA//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:memorIA - Mi Horario Académico",
    "X-WR-TIMEZONE:America/Lima",
  ];

  const now = referenceDate;
  const dtStamp = formatIcsDateTime(now);
  const today = dateTimeInput(now.toISOString()).slice(0, 10);
  const currentDay = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;

  // 1. Export Recurrent Classes with RRULE
  for (const rc of recurrentClasses) {
    const subject = subjects.find((s) => s.id === rc.subject_id);
    if (subject?.is_active === false) continue;
    const subjectName =
      (subject?.name || "Clase") +
      (rc.session_type === "laboratory"
        ? " · Laboratorio"
        : rc.session_type === "practice"
          ? " · Práctica"
          : "");
    const classroom =
      rc.classroom ||
      (rc.session_type === "laboratory" ? null : subject?.classroom) ||
      "";
    const teacher =
      rc.professor ||
      (rc.session_type === "laboratory" ? null : subject?.professor);
    const professor = teacher ? `Docente: ${teacher}` : "";

    // Calculate next occurrence date for this weekday to serve as DTSTART
    const firstDay =
      subject?.term && subject.term.start_date > today
        ? subject.term.start_date
        : today;
    const weekday = new Date(`${firstDay}T12:00:00Z`).getUTCDay() || 7;
    const daysOffset = (rc.day_of_week - weekday + 7) % 7;
    const classDay = shiftDay(firstDay, daysOffset);
    if (subject?.term && classDay > subject.term.end_date) continue;
    const startDt = new Date(
      localDateTimeToIso(`${classDay}T${rc.start_time.slice(0, 5)}`),
    );
    const endDt = new Date(
      localDateTimeToIso(`${classDay}T${rc.end_time.slice(0, 5)}`),
    );
    // The UTC date can be the following day for an evening class in Lima.
    // RRULE must use the same UTC weekday as DTSTART.
    const byDay = DAY_CODES[startDt.getUTCDay() || 7];

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:rec-${rc.id}@memoria.app`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${formatIcsDateTime(startDt)}`);
    lines.push(`DTEND:${formatIcsDateTime(endDt)}`);
    lines.push(
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}${subject?.term ? `;UNTIL=${formatIcsDateTime(new Date(localDateTimeToIso(`${subject.term.end_date}T23:59`)))}` : ""}`,
    );
    const profile = profiles.find(
      (p) => p.id === (rc.profile_id || subject?.profile_id),
    );
    const relevantDays = [
      ...new Set([
        ...(rc.exceptions || []).map((e) => e.date),
        ...profileSchedule(profile).holidays.map((h) => h.date),
      ]),
    ].filter(
      (d) =>
        d >= classDay &&
        (!subject?.term || d <= subject.term.end_date) &&
        (new Date(`${d}T12:00:00Z`).getUTCDay() || 7) === rc.day_of_week,
    );
    for (const d of relevantDays)
      if (!classOccurrence(rc, d, profile, subject))
        lines.push(
          `EXDATE:${formatIcsDateTime(new Date(localDateTimeToIso(`${d}T${rc.start_time.slice(0, 5)}`)))}`,
        );
    lines.push(`SUMMARY:${escapeText(subjectName)}`);
    if (classroom) lines.push(`LOCATION:${escapeText(classroom)}`);
    if (professor) lines.push(`DESCRIPTION:${escapeText(professor)}`);
    lines.push("END:VEVENT");
    for (const d of relevantDays) {
      const exception = rc.exceptions?.find(
        (e) => e.date === d && e.action === "override",
      );
      const occurrence = exception && classOccurrence(rc, d, profile, subject);
      if (!occurrence) continue;
      lines.push(
        "BEGIN:VEVENT",
        `UID:rec-${rc.id}@memoria.app`,
        `DTSTAMP:${dtStamp}`,
        `RECURRENCE-ID:${formatIcsDateTime(new Date(localDateTimeToIso(`${d}T${rc.start_time.slice(0, 5)}`)))}`,
        `DTSTART:${formatIcsDateTime(new Date(localDateTimeToIso(`${d}T${occurrence.start_time.slice(0, 5)}`)))}`,
        `DTEND:${formatIcsDateTime(new Date(localDateTimeToIso(`${d}T${occurrence.end_time.slice(0, 5)}`)))}`,
        `SUMMARY:${escapeText(subjectName)}`,
      );
      if (occurrence.classroom)
        lines.push(`LOCATION:${escapeText(occurrence.classroom)}`);
      const description = [
        occurrence.professor ? `Docente: ${occurrence.professor}` : "",
        exception?.note,
      ]
        .filter(Boolean)
        .join("\n");
      if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
      lines.push("END:VEVENT");
    }
  }

  // 2. Export Activities (Exams, Tasks, Meetings)
  for (const act of activities) {
    if (act.status === "cancelled" || act.invitation?.status === "declined")
      continue;
    const startDt = new Date(act.start_datetime);
    const endDt = act.end_datetime
      ? new Date(act.end_datetime)
      : new Date(
          startDt.getTime() + (act.type === "task" ? 1 : 60) * 60 * 1000,
        );

    const typePrefix =
      act.type === "exam"
        ? "[EXAMEN] "
        : act.type === "task"
          ? "[ENTREGA] "
          : act.type === "meeting"
            ? "[REUNIÓN] "
            : "";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:act-${act.id}@memoria.app`);
    lines.push(`DTSTAMP:${dtStamp}`);
    if (act.is_all_day) {
      const firstDay = dateTimeInput(act.start_datetime).slice(0, 10);
      const lastDay = act.end_datetime
        ? dateTimeInput(act.end_datetime).slice(0, 10)
        : firstDay;
      lines.push(`DTSTART;VALUE=DATE:${firstDay.replace(/-/g, "")}`);
      lines.push(
        `DTEND;VALUE=DATE:${(lastDay > firstDay ? lastDay : shiftDay(firstDay, 1)).replace(/-/g, "")}`,
      );
    } else {
      lines.push(`DTSTART:${formatIcsDateTime(startDt)}`);
      lines.push(`DTEND:${formatIcsDateTime(endDt)}`);
    }
    lines.push(
      `STATUS:${act.invitation?.status === "pending" ? "TENTATIVE" : "CONFIRMED"}`,
    );
    lines.push(
      `TRANSP:${act.type === "task" && !act.end_datetime && !act.is_all_day ? "TRANSPARENT" : "OPAQUE"}`,
    );
    lines.push(`SUMMARY:${escapeText(typePrefix + act.title)}`);
    if (act.description)
      lines.push(`DESCRIPTION:${escapeText(act.description)}`);
    if (act.subject?.name)
      lines.push(`CATEGORIES:${escapeText(act.subject.name)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

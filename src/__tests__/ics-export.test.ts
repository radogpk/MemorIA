import { describe, it, expect } from "vitest";
import { generateIcsCalendarContent } from "@/lib/calendar/ics-export";
import {
  INITIAL_SUBJECTS,
  INITIAL_RECURRENT_CLASSES,
  getInitialActivities,
} from "@/lib/storage/initial-data";
import type { Activity, RecurrentClass, Subject } from "@/types/database.types";

describe("ICS Calendar Export Engine (RFC 5545)", () => {
  it("should generate valid RFC 5545 calendar structure", () => {
    const subjects = INITIAL_SUBJECTS;
    const recurrentClasses = INITIAL_RECURRENT_CLASSES;
    const activities = getInitialActivities();

    const icsContent = generateIcsCalendarContent(
      subjects,
      recurrentClasses,
      activities,
    );

    expect(icsContent).toContain("BEGIN:VCALENDAR");
    expect(icsContent).toContain("VERSION:2.0");
    expect(icsContent).toContain("PRODID:-//memorIA//ES");
    expect(icsContent).toContain("END:VCALENDAR");

    // Should include weekly recurrence rules for classes
    expect(icsContent).toContain("RRULE:FREQ=WEEKLY");
    expect(icsContent).toContain("SUMMARY:Innovación");

    // Should include activities (exams / tasks)
    expect(icsContent).toContain("SUMMARY:[EXAMEN] Examen Parcial");
  });
});

describe("Calendar integration data fidelity", () => {
  const now = new Date("2026-11-06T02:00:00Z"); // Thursday 21:00 in Lima.
  const subject: Subject = {
    id: "subject",
    name: "Física, práctica; 2",
    code: null,
    color: "#97c7e7",
    professor: "Theory teacher",
    classroom: "Theory room",
    is_active: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  const lab: RecurrentClass = {
    id: "lab",
    subject_id: subject.id,
    day_of_week: 4,
    start_time: "22:00",
    end_time: "23:00",
    classroom: null,
    session_type: "laboratory",
    created_at: now.toISOString(),
  };
  const activity = (input: Partial<Activity> = {}): Activity => ({
    id: "a",
    profile_id: "p",
    title: "Cenar",
    description: null,
    subject_id: null,
    type: "personal",
    status: "pending",
    start_datetime: "2026-11-05T17:00:00.000Z",
    end_datetime: "2026-11-05T18:00:00.000Z",
    is_all_day: false,
    priority: "medium",
    metadata: {},
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...input,
  });
  const unfold = (value: string) => value.replace(/\r\n[ \t]/g, "");
  it("preserves the weekday of an evening class across UTC midnight and never copies the theory room into a lab", () => {
    const content = unfold(
      generateIcsCalendarContent([subject], [lab], [], now),
    );
    expect(content).toContain("DTSTART:20261106T030000Z");
    expect(content).toContain("RRULE:FREQ=WEEKLY;BYDAY=FR");
    expect(content).not.toContain("LOCATION:Theory room");
    expect(content).not.toContain("Docente: Theory teacher");
  });
  it("escapes punctuation and prevents a description from injecting event properties", () => {
    const content = unfold(
      generateIcsCalendarContent(
        [],
        [],
        [
          activity({
            title: "Cenar, pasear; juntos",
            description: "Lugar\\casa\nBEGIN:VEVENT",
          }),
        ],
        now,
      ),
    );
    expect(content).toContain("SUMMARY:Cenar\\, pasear\\; juntos");
    expect(content).toContain("DESCRIPTION:Lugar\\\\casa\\nBEGIN:VEVENT");
    expect(content.match(/\r\nBEGIN:VEVENT/g)).toHaveLength(1);
  });
  it("folds UTF-8 content lines without damaging accents or emoji", () => {
    const title = "Norely y Gerardo 💙 ".repeat(12);
    const content = generateIcsCalendarContent(
      [],
      [],
      [activity({ title })],
      now,
    );
    expect(
      content
        .split("\r\n")
        .every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
    expect(unfold(content)).toContain(`SUMMARY:${title}`);
  });
  it("exports all-day activities as dates with an exclusive end", () => {
    const content = generateIcsCalendarContent(
      [],
      [],
      [activity({ is_all_day: true, end_datetime: null })],
      now,
    );
    expect(content).toContain("DTSTART;VALUE=DATE:20261105");
    expect(content).toContain("DTEND;VALUE=DATE:20261106");
  });
  it("marks pending invitations as tentative and ignores rejected or cancelled plans", () => {
    const invitation = {
      recipient_id: "other",
      status: "pending" as const,
      responded_at: null,
    };
    const content = generateIcsCalendarContent(
      [],
      [],
      [
        activity({ invitation }),
        activity({
          id: "declined",
          invitation: { ...invitation, status: "declined" },
        }),
        activity({ id: "cancelled", status: "cancelled" }),
      ],
      now,
    );
    expect(content).toContain("STATUS:TENTATIVE");
    expect(content).not.toContain("UID:act-declined");
    expect(content).not.toContain("UID:act-cancelled");
  });
  it("keeps durationless deadlines transparent and omits inactive courses", () => {
    const content = generateIcsCalendarContent(
      [{ ...subject, is_active: false }],
      [lab],
      [activity({ type: "task", end_datetime: null })],
      now,
    );
    expect(content).toContain("TRANSP:TRANSPARENT");
    expect(content).not.toContain("RRULE:");
  });
});

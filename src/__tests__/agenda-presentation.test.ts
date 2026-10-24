import { describe, expect, it } from "vitest";
import {
  calendarDate,
  calendarDayKey,
  eventTime,
  fallsOnDay,
  isDeadline,
  sortAgenda,
} from "@/lib/calendar/presentation";
import { projectRecurrentClassesForRange } from "@/lib/calendar/projection";
import type { CalendarEvent } from "@/lib/calendar/types";

const event = (
  start: string,
  end: string,
  extra: Partial<CalendarEvent> = {},
): CalendarEvent => ({
  id: "event",
  title: "Una actividad",
  type: "personal",
  start: new Date(start),
  end: new Date(end),
  ...extra,
});
describe("Peru agenda dates and event boundaries", () => {
  it("keeps the user's day when UTC already shows tomorrow", () => {
    expect(calendarDayKey(calendarDate(new Date("2026-10-24T02:30:00Z")))).toBe(
      "2026-10-23",
    );
    expect(eventTime(new Date("2026-10-24T02:30:00Z"))).toBe("21:30");
  });
  it("shows a meeting spanning midnight on both actual Peru days", () => {
    const a = event("2026-10-24T04:30:00Z", "2026-10-24T05:30:00Z");
    expect(fallsOnDay(a, new Date("2026-10-23T12:00:00"))).toBe(true);
    expect(fallsOnDay(a, new Date("2026-10-24T12:00:00"))).toBe(true);
  });
  it("does not turn a 23:59 task deadline into an hour booked tomorrow", () => {
    const a = event("2026-10-24T04:59:00Z", "2026-10-24T05:59:00Z", {
      type: "task",
      sourceActivity: { end_datetime: null } as CalendarEvent["sourceActivity"],
    });
    expect(isDeadline(a)).toBe(true);
    expect(fallsOnDay(a, new Date("2026-10-23T12:00:00"))).toBe(true);
    expect(fallsOnDay(a, new Date("2026-10-24T12:00:00"))).toBe(false);
  });
  it("treats an exclusive midnight ending as belonging to the prior day", () => {
    const a = event("2026-10-24T03:00:00Z", "2026-10-24T05:00:00Z");
    expect(fallsOnDay(a, new Date("2026-10-23T12:00:00"))).toBe(true);
    expect(fallsOnDay(a, new Date("2026-10-24T12:00:00"))).toBe(false);
  });
  it("projects 07:00 classes to 07:00 Peru independently of the browser timezone", () => {
    const rows = projectRecurrentClassesForRange(
      [
        {
          id: "lab",
          subject_id: "course",
          day_of_week: 5,
          start_time: "07:00",
          end_time: "09:00",
          classroom: "L-1",
          created_at: "2026-01-01T12:00:00Z",
          session_type: "laboratory",
        },
      ],
      new Date("2026-10-23T00:00:00"),
      new Date("2026-10-23T23:59:59"),
    );
    expect(rows[0].start.toISOString()).toBe("2026-10-23T12:00:00.000Z");
    expect(eventTime(rows[0].start)).toBe("07:00");
  });
  it("orders simultaneous profile events consistently without mutating the source", () => {
    const a = event("2026-10-23T19:00:00Z", "2026-10-23T20:00:00Z", {
      id: "late",
    });
    const b = event("2026-10-23T12:00:00Z", "2026-10-23T13:00:00Z", {
      id: "early",
    });
    const input = [a, b];
    expect(sortAgenda(input).map((e) => e.id)).toEqual(["early", "late"]);
    expect(input[0].id).toBe("late");
  });
});

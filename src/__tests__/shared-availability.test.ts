import { describe, expect, it } from "vitest";
import {
  busyForDay,
  commonFreeWindows,
  suggestedStarts,
  sharedPlanConflicts,
  dayStart,
  timeLabel,
} from "@/lib/calendar/availability";
import {
  emptySnapshot,
  normalizeSnapshot,
  stableUuid,
  respondToInvitation,
  isVisibleActivity,
  isPendingInvitation,
} from "@/lib/storage/model";
import { localDateTimeToIso } from "@/lib/ai/date-parser";
import { validateBatch } from "@/lib/storage/validation";
import { Activity, Subject } from "@/types/database.types";
import {
  GERARDO_PROFILE_ID as G,
  EVEBEBE_PROFILE_ID as E,
} from "@/lib/supabase/data";
const day = "2026-11-05"; // Thursday in Peru, even when the server uses UTC.
const iso = (time: string) => localDateTimeToIso(`${day}T${time}`);
const ms = (time: string) => Date.parse(iso(time));
const subject: Subject = {
  id: stableUuid("subject"),
  profile_id: E,
  name: "Física",
  code: null,
  color: "#97c7e7",
  professor: "Teoría",
  classroom: null,
  is_active: true,
  created_at: iso("07:00"),
  updated_at: iso("07:00"),
};
const plan = (input: Partial<Activity> = {}): Activity => ({
  id: crypto.randomUUID(),
  profile_id: G,
  title: "Cita",
  description: null,
  subject_id: null,
  type: "personal",
  status: "pending",
  start_datetime: iso("10:00"),
  end_datetime: iso("11:00"),
  is_all_day: false,
  priority: "medium",
  is_shared: false,
  invitation: null,
  metadata: {},
  created_at: iso("07:00"),
  updated_at: iso("07:00"),
  ...input,
});
const snapshot = () =>
  normalizeSnapshot({
    ...emptySnapshot(),
    subjects: [subject],
    recurrentClasses: [
      {
        id: stableUuid("lab"),
        subject_id: subject.id,
        profile_id: E,
        session_type: "laboratory",
        day_of_week: 4,
        start_time: "10:00",
        end_time: "12:00",
        classroom: "Lab 2",
        created_at: iso("07:00"),
      },
    ],
  });
const batch = (a: Activity, actor = G) => ({
  id: crypto.randomUUID(),
  actor,
  mutations: [
    {
      id: crypto.randomUUID(),
      table: "activities",
      action: "upsert",
      record: a,
    },
  ],
});
describe("Shared availability", () => {
  it("repairs Norely's old name without changing her identity or course ownership", () => {
    const s = snapshot();
    const beforeId = s.profiles.find((p) => p.id === E)!.id;
    const restored = normalizeSnapshot({
      ...s,
      profiles: s.profiles.map((p) =>
        p.id === E ? { ...p, name: "Evebebé", nickname: "Evebebé" } : p,
      ),
    });
    expect(restored.profiles.find((p) => p.id === E)).toMatchObject({
      id: beforeId,
      name: "Norely",
      nickname: "Evebebé",
    });
    expect(restored.subjects[0].profile_id).toBe(E);
    expect(restored.recurrentClasses[0].profile_id).toBe(E);
  });
  it("keeps declined plans out of both agendas and prevents responding to closed invitations", () => {
    const a = plan({
      is_shared: true,
      invitation: { recipient_id: E, status: "declined", responded_at: null },
    });
    expect(isVisibleActivity(a, G)).toBe(false);
    expect(isVisibleActivity(a, E)).toBe(false);
    for (const status of ["cancelled", "completed"] as const) {
      const closed = {
        ...a,
        status,
        invitation: { ...a.invitation!, status: "pending" as const },
      };
      expect(isPendingInvitation(closed)).toBe(false);
      expect(() => respondToInvitation(closed, E, "accepted")).toThrow();
    }
  });
  it("includes the partner's lab in Lima without mixing the owners", () => {
    const s = snapshot();
    expect(busyForDay(s, day, G)).toEqual([]);
    expect(busyForDay(s, day, E)).toMatchObject([
      { start: ms("10:00"), end: ms("12:00"), detail: "Laboratorio · Lab 2" },
    ]);
    s.subjects[0].is_active = false;
    expect(busyForDay(s, day, E)).toEqual([]);
  });
  it("merges overlapping obligations and allows a plan to start exactly when a class ends", () => {
    const s = snapshot();
    s.activities.push(
      plan({ start_datetime: iso("11:00"), end_datetime: iso("13:00") }),
    );
    const windows = commonFreeWindows(
      [...busyForDay(s, day, G), ...busyForDay(s, day, E)],
      ms("08:00"),
      ms("15:00"),
      60,
    );
    expect(windows).toEqual([
      { start: ms("08:00"), end: ms("10:00") },
      { start: ms("13:00"), end: ms("15:00") },
    ]);
    expect(suggestedStarts(windows, 60).map(timeLabel)).toEqual([
      "08:00",
      "08:30",
      "09:00",
      "13:00",
      "13:30",
      "14:00",
    ]);
  });
  it("reserves pending invitations for both, frees declined invitations and excludes the proposal being edited", () => {
    const a = plan({
      is_shared: true,
      invitation: { recipient_id: E, status: "pending", responded_at: null },
    });
    const s = { ...emptySnapshot(), activities: [a] };
    expect(busyForDay(s, day, G)).toHaveLength(1);
    expect(busyForDay(s, day, E)).toHaveLength(1);
    expect(busyForDay(s, day, E, a.id)).toHaveLength(0);
    a.invitation!.status = "declined";
    expect(busyForDay(s, day, G)).toHaveLength(0);
    expect(busyForDay(s, day, E)).toHaveLength(0);
  });
  it("includes overnight activities from the previous day and all-day reservations", () => {
    const overnight = plan({
      start_datetime: localDateTimeToIso("2026-11-04T23:00"),
      end_datetime: iso("08:30"),
    });
    const s = { ...emptySnapshot(), activities: [overnight] };
    expect(busyForDay(s, day, G)).toMatchObject([
      { start: dayStart(day), end: ms("08:30") },
    ]);
    s.activities = [plan({ is_all_day: true, end_datetime: null })];
    expect(
      commonFreeWindows(busyForDay(s, day, G), ms("07:00"), ms("23:00"), 30),
    ).toEqual([]);
  });
  it("ignores cancelled, completed and durationless task deadlines", () => {
    const s = {
      ...emptySnapshot(),
      activities: [
        plan({ status: "cancelled" }),
        plan({ status: "completed" }),
        plan({ type: "task", end_datetime: null }),
      ],
    };
    expect(busyForDay(s, day, G)).toEqual([]);
  });
  it("checks all days of a proposed overnight plan", () => {
    const s = snapshot();
    const p = plan({
      start_datetime: localDateTimeToIso("2026-11-04T23:00"),
      end_datetime: iso("11:00"),
      is_shared: true,
    });
    expect(sharedPlanConflicts(s, p)[0]).toMatchObject({
      profileId: E,
      period: { detail: "Laboratorio · Lab 2" },
    });
  });
  it("rejects sending a plan over a partner's lab and accepts an adjacent free hour", () => {
    const a = plan({
      is_shared: true,
      invitation: { recipient_id: E, status: "pending", responded_at: null },
    });
    expect(() => validateBatch(batch(a), snapshot())).toThrow("Física");
    expect(() =>
      validateBatch(
        batch({
          ...a,
          start_datetime: iso("12:00"),
          end_datetime: iso("13:00"),
        }),
        snapshot(),
      ),
    ).not.toThrow();
  });
  it("rechecks acceptance after a new commitment and still allows declining", () => {
    const a = plan({
      is_shared: true,
      invitation: { recipient_id: E, status: "pending", responded_at: null },
    });
    const s = snapshot();
    s.activities = [a];
    expect(() =>
      validateBatch(batch(respondToInvitation(a, E, "accepted"), E), s),
    ).toThrow("Física");
    expect(() =>
      validateBatch(batch(respondToInvitation(a, E, "declined"), E), s),
    ).not.toThrow();
  });
  it("does not double-count an accepted invitation as conflicting with itself", () => {
    const a = plan({
      is_shared: true,
      invitation: { recipient_id: E, status: "pending", responded_at: null },
    });
    const s = { ...emptySnapshot(), activities: [a] };
    expect(() =>
      validateBatch(batch(respondToInvitation(a, E, "accepted"), E), s),
    ).not.toThrow();
  });
  it("accepts an equivalent ISO timezone representation without treating the proposal as changed", () => {
    const a = plan({
      is_shared: true,
      invitation: { recipient_id: E, status: "pending", responded_at: null },
    });
    const s = { ...emptySnapshot(), activities: [a] };
    const response = {
      ...respondToInvitation(a, E, "accepted"),
      start_datetime: `${day}T10:00:00-05:00`,
      end_datetime: `${day}T11:00:00-05:00`,
    };
    expect(() => validateBatch(batch(response, E), s)).not.toThrow();
  });
  it("offers no slots when the requested duration cannot fit", () => {
    expect(commonFreeWindows([], ms("08:00"), ms("08:45"), 60)).toEqual([]);
    expect(commonFreeWindows([], ms("18:00"), ms("08:00"), 60)).toEqual([]);
  });
});

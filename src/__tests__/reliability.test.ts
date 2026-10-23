import { describe, it, expect } from "vitest";
import {
  parseQuickAdd,
  dateTimeInput,
  localDateTimeToIso,
} from "@/lib/ai/date-parser";
import {
  emptySnapshot,
  normalizeSnapshot,
  isVisibleActivity,
  respondToInvitation,
  applyMutations,
  stableUuid,
  Mutation,
} from "@/lib/storage/model";
import { validateBatch } from "@/lib/storage/validation";
import {
  GERARDO_PROFILE_ID as G,
  EVEBEBE_PROFILE_ID as E,
} from "@/lib/supabase/data";
import { Activity, Subject, RecurrentClass } from "@/types/database.types";
import { layoutTimedEvents } from "@/lib/calendar/layout";
import {
  projectRecurrentClassesForRange,
  detectCollisions,
} from "@/lib/calendar/projection";
const ref = "2026-10-23T02:30:00.000Z"; // Thursday 22, 21:30 in Lima; Friday on the UTC server.
const subject: Subject = {
  id: "sub-legacy",
  profile_id: G,
  name: "Estadística",
  code: "EST",
  professor: "Teoría",
  classroom: "A-1",
  color: "#7cb8df",
  is_active: true,
  created_at: ref,
  updated_at: ref,
};
const activity: Activity = {
  id: stableUuid("cita"),
  profile_id: G,
  title: "Cenar juntos",
  subject_id: null,
  description: null,
  type: "personal",
  status: "pending",
  start_datetime: "2026-11-05T20:00:00.000Z",
  end_datetime: null,
  is_all_day: false,
  priority: "medium",
  is_shared: true,
  metadata: {},
  created_at: ref,
  updated_at: ref,
  invitation: { recipient_id: E, status: "pending", responded_at: null },
};
describe("Spanish dates are independent of server timezone", () => {
  it("matches a unique short course name and leaves ambiguous names unassigned", () => {
    const courses = [
      { id: "statistics", name: "Estadística y Probabilidades" },
      { id: "design-a", name: "Diseño de Software" },
      { id: "design-b", name: "Diseño Digital" },
    ];
    expect(
      parseQuickAdd("Entrega de Estadística mañana", courses, ref).subject_id,
    ).toBe("statistics");
    expect(
      parseQuickAdd("Tarea de Diseño mañana", courses, ref).subject_id,
    ).toBeNull();
  });
  it("reads spoken minutes and refuses competing dates", () => {
    expect(
      parseQuickAdd(
        "Tarea mañana a las once y cincuenta y nueve de la noche",
        [],
        ref,
      ).start_datetime,
    ).toBe("2026-10-24T04:59:00.000Z");
    expect(() => parseQuickAdd("Cita el 5 o 6 de noviembre", [], ref)).toThrow(
      "varios días",
    );
  });
  it.each([
    ["Tarea mañana a las 3 pm", "2026-10-23T20:00:00.000Z"],
    ["Cita hoy a las 10 pm", "2026-10-23T03:00:00.000Z"],
    ["Entrega pasado mañana a las 08:30", "2026-10-24T13:30:00.000Z"],
    ["Examen el lunes a las 10 am", "2026-10-26T15:00:00.000Z"],
    ["Examen el domingo a las 9", "2026-10-25T14:00:00.000Z"],
    ["Examen el sábado a las 9", "2026-10-24T14:00:00.000Z"],
    [
      "Cita el 5 de noviembre a las tres y media de la tarde",
      "2026-11-05T20:30:00.000Z",
    ],
    [
      "Entrega el veintitrés de octubre a las 23:59",
      "2026-10-24T04:59:00.000Z",
    ],
    ["Tarea el 05/11/2026 a las 12 am", "2026-11-05T05:00:00.000Z"],
    ["Tarea el 2026-11-05 a las 12 pm", "2026-11-05T17:00:00.000Z"],
    ["Examen en tres días a las 10", "2026-10-25T15:00:00.000Z"],
  ])("%s", (text, want) =>
    expect(parseQuickAdd(text, [], ref).start_datetime).toBe(want),
  );
  it("does not invent a date when missing or when mañana only means morning", () => {
    expect(() => parseQuickAdd("Examen de Estadística", [], ref)).toThrow(
      "Indica una fecha",
    );
    expect(() => parseQuickAdd("Examen a las 8 de la mañana", [], ref)).toThrow(
      "Indica una fecha",
    );
  });
  it("rejects impossible calendar days and hours", () => {
    expect(() =>
      parseQuickAdd("Tarea el 31 de febrero a las 10", [], ref),
    ).toThrow("no existe");
    expect(() => parseQuickAdd("Tarea mañana a las 25:90", [], ref)).toThrow(
      "hora",
    );
  });
  it("converts a reviewed local date without shifting its day", () => {
    expect(dateTimeInput("2026-11-05T20:00:00.000Z")).toBe("2026-11-05T15:00");
    expect(localDateTimeToIso("2026-11-05T15:00")).toBe(
      "2026-11-05T20:00:00.000Z",
    );
  });
});
describe("Ownership, labs and invitations", () => {
  it("gives intersecting events separate columns and reuses space after they finish", () => {
    const event = (id: string, hour: number, end: number) => ({
      id,
      title: id,
      type: "class" as const,
      start: new Date(2026, 10, 1, hour),
      end: new Date(2026, 10, 1, end),
    });
    const layout = layoutTimedEvents([
      event("a", 8, 10),
      event("b", 9, 11),
      event("c", 12, 13),
    ]);
    expect(layout.get("a")).toEqual({ column: 0, columns: 2 });
    expect(layout.get("b")).toEqual({ column: 1, columns: 2 });
    expect(layout.get("c")).toEqual({ column: 0, columns: 1 });
  });
  it("repairs missing class ownership from its parent without removing legacy notes", () => {
    const c: RecurrentClass = {
      id: "rec-legacy",
      subject_id: subject.id,
      day_of_week: 1,
      start_time: "08:00:00",
      end_time: "10:00:00",
      classroom: "Lab 01",
      created_at: ref,
    };
    const s = normalizeSnapshot({
      ...emptySnapshot(),
      subjects: [subject],
      recurrentClasses: [c],
      activities: [activity],
    });
    expect(s.recurrentClasses[0]).toMatchObject({
      profile_id: G,
      session_type: "laboratory",
      start_time: "08:00",
    });
    expect(s.activities).toHaveLength(1);
    expect(stableUuid(s.subjects[0].id)).toBe(s.subjects[0].id);
  });
  it("projects a lab with its own room and professor", () => {
    const c: RecurrentClass = {
      id: "lab",
      subject_id: subject.id,
      profile_id: G,
      day_of_week: 1,
      start_time: "08:00",
      end_time: "10:00",
      classroom: "L-2",
      professor: "Docente de laboratorio",
      session_type: "laboratory",
      created_at: ref,
      subject,
    };
    const [event] = projectRecurrentClassesForRange(
      [c],
      new Date("2026-10-26T00:00:00"),
      new Date("2026-10-26T23:59:59"),
    );
    expect(event.title).toContain("Laboratorio");
    expect(event.classroom).toBe("L-2");
    expect(event.professor).toBe("Docente de laboratorio");
    const [withoutRoom] = projectRecurrentClassesForRange(
      [{ ...c, classroom: null }],
      new Date("2026-10-26T00:00:00"),
      new Date("2026-10-26T23:59:59"),
    );
    expect(withoutRoom.classroom).toBeNull();
  });
  it("shows a proposed date to the recipient only after accepting", () => {
    expect(isVisibleActivity(activity, E)).toBe(false);
    expect(isVisibleActivity(activity, G)).toBe(true);
    const accepted = respondToInvitation(activity, E, "accepted");
    expect(isVisibleActivity(accepted, E)).toBe(true);
    expect(accepted.invitation?.responded_at).toBeTruthy();
    expect(() => respondToInvitation(activity, G, "accepted")).toThrow();
    expect(
      isVisibleActivity(respondToInvitation(activity, E, "declined"), E),
    ).toBe(false);
  });
  it("keeps notes when a course is removed", () => {
    const s = normalizeSnapshot({
      ...emptySnapshot(),
      subjects: [subject],
      activities: [{ ...activity, subject_id: subject.id }],
    });
    const result = applyMutations(s, [
      {
        id: crypto.randomUUID(),
        table: "subjects",
        action: "delete",
        record: { id: s.subjects[0].id },
      },
    ]);
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0].subject_id).toBeNull();
  });
  it("rejects a cross-profile subject even if display normalization could repair it", () => {
    const s = normalizeSnapshot({ ...emptySnapshot(), subjects: [subject] });
    expect(() =>
      validateBatch(
        {
          id: crypto.randomUUID(),
          actor: E,
          mutations: [
            {
              id: crypto.randomUUID(),
              table: "activities",
              action: "upsert",
              record: {
                ...activity,
                profile_id: E,
                subject_id: s.subjects[0].id,
                invitation: null,
              },
            },
          ],
        },
        s,
      ),
    ).toThrow("mismo perfil");
  });
  it("does not report collisions with the other profile’s classes", () => {
    const a = {
      ...activity,
      is_shared: false,
      start_datetime: "2026-11-05T08:00:00",
      end_datetime: "2026-11-05T09:00:00",
    };
    const events = [
      {
        id: "partner-class",
        title: "Clase de Eve",
        type: "class" as const,
        profileId: E,
        start: new Date(a.start_datetime),
        end: new Date(a.end_datetime),
      },
    ];
    expect(detectCollisions([a], events)).toEqual({});
  });
});

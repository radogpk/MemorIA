import { describe, it, expect } from "vitest";
import type { Activity, RecurrentClass, Subject } from "@/types/database.types";
import {
  emptySnapshot,
  normalizeSnapshot,
  stableUuid,
  counterProposal,
  invitationParticipants,
  respondToInvitation,
  applyMutations,
  isVisibleActivity,
} from "@/lib/storage/model";
import { validateBatch } from "@/lib/storage/validation";
import {
  buildRestorePreview,
  parseBackup,
  snapshotKey,
} from "@/lib/storage/restore";
import { classOccurrence, profileSchedule } from "@/lib/calendar/academic";
import {
  busyForDay,
  sharedPlanConflicts,
  commonFreeWindows,
  dayStart,
} from "@/lib/calendar/availability";
import { projectRecurrentClassesForRange } from "@/lib/calendar/projection";
import { generateIcsCalendarContent } from "@/lib/calendar/ics-export";
import { localDateTimeToIso } from "@/lib/ai/date-parser";
import { notificationChanges } from "@/lib/push/model";
import {
  GERARDO_PROFILE_ID as G,
  EVEBEBE_PROFILE_ID as N,
} from "@/lib/supabase/data";

const day = "2026-11-05"; // Thursday.
const iso = (time: string, date = day) => localDateTimeToIso(`${date}T${time}`);
const course = (owner = N): Subject => ({
  id: stableUuid(`course-${owner}`),
  profile_id: owner,
  name: "Física",
  code: "F-2",
  color: "#97c7e7",
  classroom: "Teoría 1",
  professor: "Docente de teoría",
  is_active: true,
  created_at: iso("07:00"),
  updated_at: iso("07:00"),
  term: { name: "2026-II", start_date: "2026-10-01", end_date: "2026-12-31" },
});
const session = (subject = course()): RecurrentClass => ({
  id: stableUuid(`lab-${subject.id}`),
  subject_id: subject.id,
  profile_id: subject.profile_id,
  day_of_week: 4,
  start_time: "10:00",
  end_time: "12:00",
  classroom: "Lab 2",
  professor: "Docente de laboratorio",
  session_type: "laboratory",
  created_at: iso("07:00"),
  exceptions: [],
});
const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: crypto.randomUUID(),
  profile_id: G,
  subject_id: null,
  title: "Cita",
  description: "Cenar juntos",
  type: "personal",
  status: "pending",
  start_datetime: iso("15:00"),
  end_datetime: iso("16:00"),
  is_all_day: false,
  priority: "medium",
  is_shared: true,
  invitation: { recipient_id: N, status: "pending", responded_at: null },
  metadata: {},
  created_at: iso("07:00"),
  updated_at: iso("07:00"),
  ...overrides,
});
const state = () =>
  normalizeSnapshot({
    ...emptySnapshot(),
    subjects: [course()],
    recurrentClasses: [session()],
  });
const operation = (
  record: object,
  table = "activities",
  actor = G,
  extra = {},
) => ({
  id: crypto.randomUUID(),
  actor,
  mutations: [
    { id: crypto.randomUUID(), table, action: "upsert", record, ...extra },
  ],
});

describe("Counterproposals on one invitation", () => {
  it("changes the deciding person while preserving the owner, title and identity", () => {
    const a = activity(),
      counter = counterProposal(a, N, iso("17:00"), iso("18:00"));
    const before = { ...emptySnapshot(), activities: [a] };
    const batch = validateBatch(
      operation(counter, "activities", N, {
        intent: "counterproposal",
        expected_updated_at: a.updated_at,
      }),
      before,
    );
    const after = applyMutations(before, batch.mutations),
      stored = after.activities[0];
    expect(after.activities).toHaveLength(1);
    expect(stored).toMatchObject({
      id: a.id,
      profile_id: G,
      title: a.title,
      invitation: {
        proposed_by: N,
        recipient_id: G,
        status: "pending",
        previous_start: a.start_datetime,
      },
    });
    expect(invitationParticipants(stored)).toEqual([N, G]);
    expect(busyForDay(after, day, N)).toHaveLength(1);
    expect(busyForDay(after, day, G)).toHaveLength(1);
    expect(isVisibleActivity(stored, N)).toBe(true);
    expect(notificationChanges(before, after)[0]).toMatchObject({
      profile_id: G,
      title: "Norely te invita",
    });
  });
  it("lets Gerardo confirm Norely's alternative and sends the answer to Norely", () => {
    const a = counterProposal(activity(), N, iso("17:00"), iso("18:00"));
    const s = { ...emptySnapshot(), activities: [a] };
    const batch = validateBatch(
      operation(respondToInvitation(a, G, "accepted")),
      s,
    );
    const after = applyMutations(s, batch.mutations);
    expect(after.activities[0].invitation?.status).toBe("accepted");
    expect(
      notificationChanges(s, after).find((j) => j.kind === "response")
        ?.profile_id,
    ).toBe(N);
  });
  it("supports another alternative from Gerardo without duplicating the event", () => {
    const a = counterProposal(activity(), N, iso("17:00"), iso("18:00"));
    const next = counterProposal(a, G, iso("19:00"), iso("20:00"));
    const s = { ...emptySnapshot(), activities: [a] };
    const checked = validateBatch(
      operation(next, "activities", G, { intent: "counterproposal" }),
      s,
    );
    expect(
      applyMutations(s, checked.mutations).activities[0].invitation,
    ).toMatchObject({ proposed_by: G, recipient_id: N });
  });
  it("rejects edits by a third person, closed invitations, the same hour and stale responses", () => {
    const a = activity();
    expect(() => counterProposal(a, G, iso("17:00"), iso("18:00"))).toThrow();
    expect(() =>
      counterProposal(
        { ...a, status: "cancelled" },
        N,
        iso("17:00"),
        iso("18:00"),
      ),
    ).toThrow();
    expect(() =>
      counterProposal(a, N, a.start_datetime, a.end_datetime!),
    ).toThrow("diferente");
    const counter = counterProposal(a, N, iso("17:00"), iso("18:00"));
    expect(() =>
      validateBatch(
        operation(counter, "activities", N, {
          intent: "counterproposal",
          expected_updated_at: iso("06:00"),
        }),
        { ...emptySnapshot(), activities: [a] },
      ),
    ).toThrow("otro dispositivo");
    expect(() =>
      validateBatch(
        operation(respondToInvitation(a, N, "accepted"), "activities", N),
        { ...emptySnapshot(), activities: [counter] },
      ),
    ).toThrow();
  });
  it("rechecks the partner lab when proposing an alternative and only accepts date changes", () => {
    const a = activity(),
      s = { ...state(), activities: [a] };
    const counter = counterProposal(a, N, iso("10:00"), iso("11:00"));
    expect(() =>
      validateBatch(
        operation(counter, "activities", N, { intent: "counterproposal" }),
        s,
      ),
    ).toThrow("Física");
    const safe = {
      ...counterProposal(a, N, iso("17:00"), iso("18:00")),
      title: "Injected title",
      profile_id: N,
    };
    const checked = validateBatch(
      operation(safe, "activities", N, { intent: "counterproposal" }),
      s,
    );
    expect(checked.mutations[0].record.title).toBe(a.title);
    expect(checked.mutations[0].record.profile_id).toBe(G);
  });
});

describe("Semesters, profile and course holidays, and dated sessions", () => {
  it("keeps Norely's classes unless a course opts out; Gerardo's default can skip registered dates", () => {
    const s = state(),
      n = s.profiles.find((p) => p.id === N)!;
    n.schedule = {
      ...profileSchedule(n),
      holidays: [{ date: day, name: "Feriado registrado" }],
    };
    expect(
      classOccurrence(s.recurrentClasses[0], day, n, s.subjects[0]),
    ).not.toBeNull();
    expect(
      classOccurrence(s.recurrentClasses[0], day, n, {
        ...s.subjects[0],
        holiday_policy: "skip",
      }),
    ).toBeNull();
    const g = s.profiles.find((p) => p.id === G)!;
    g.schedule = {
      ...profileSchedule(g),
      holidays: [{ date: day, name: "Feriado" }],
    };
    expect(classOccurrence(session(course(G)), day, g, course(G))).toBeNull();
    expect(
      classOccurrence(session(course(G)), day, g, {
        ...course(G),
        holiday_policy: "attend",
      }),
    ).not.toBeNull();
  });
  it("bounds recurring sessions by the semester in both availability and calendar", () => {
    const s = state();
    expect(busyForDay(s, "2027-01-07", N)).toEqual([]);
    expect(busyForDay(s, "2026-09-24", N)).toEqual([]);
    expect(
      projectRecurrentClassesForRange(
        s.recurrentClasses,
        new Date(2027, 0, 7),
        new Date(2027, 0, 7),
        s.profiles,
      ),
    ).toEqual([]);
  });
  it("overrides a holiday for one lab, changes its room/teacher/time, and preserves next week's baseline", () => {
    const s = state();
    const n = s.profiles.find((p) => p.id === N)!;
    n.schedule = {
      holiday_policy: "skip",
      travel_minutes: 0,
      holidays: [{ date: day, name: "Feriado" }],
    };
    s.recurrentClasses[0].exceptions = [
      {
        date: day,
        action: "override",
        start_time: "13:00",
        end_time: "14:00",
        classroom: "Lab nuevo",
        professor: "Suplente",
      },
    ];
    const effective = classOccurrence(
      s.recurrentClasses[0],
      day,
      n,
      s.subjects[0],
    )!;
    expect(effective).toMatchObject({
      start_time: "13:00",
      classroom: "Lab nuevo",
      professor: "Suplente",
    });
    expect(busyForDay(s, day, N)[0]).toMatchObject({
      start: Date.parse(iso("13:00")),
      detail: "Laboratorio · Lab nuevo",
    });
    expect(
      classOccurrence(s.recurrentClasses[0], "2026-11-12", n, s.subjects[0]),
    ).toMatchObject({ start_time: "10:00", classroom: "Lab 2" });
    const [projected] = projectRecurrentClassesForRange(
      s.recurrentClasses,
      new Date(2026, 10, 5),
      new Date(2026, 10, 5),
      s.profiles,
    );
    expect(projected.classroom).toBe("Lab nuevo");
    expect(projected.professor).toBe("Suplente");
  });
  it("cancels only the selected date and never inherits a theory room for a laboratory", () => {
    const s = state(),
      c = s.recurrentClasses[0];
    c.exceptions = [{ date: day, action: "cancel" }];
    expect(busyForDay(s, day, N)).toEqual([]);
    expect(busyForDay(s, "2026-11-12", N)).toHaveLength(1);
    expect(
      classOccurrence(
        { ...c, classroom: null, professor: null, exceptions: [] },
        day,
        s.profiles[1],
        s.subjects[0],
      ),
    ).toMatchObject({ classroom: null, professor: null });
  });
  it("rejects invalid semester dates, a change on the wrong weekday and inverted override times", () => {
    const s = state();
    expect(() =>
      validateBatch(
        operation(
          {
            ...course(),
            term: {
              name: "X",
              start_date: "2026-12-01",
              end_date: "2026-11-01",
            },
          },
          "subjects",
          N,
        ),
        s,
      ),
    ).toThrow("semestre");
    expect(() =>
      validateBatch(
        operation(
          {
            ...session(),
            exceptions: [{ date: "2026-11-06", action: "cancel" }],
          },
          "recurrentClasses",
          N,
        ),
        s,
      ),
    ).toThrow("día semanal");
    expect(() =>
      validateBatch(
        operation(
          {
            ...session(),
            exceptions: [
              {
                date: day,
                action: "override",
                start_time: "14:00",
                end_time: "13:00",
              },
            ],
          },
          "recurrentClasses",
          N,
        ),
        s,
      ),
    ).toThrow("posterior");
  });
  it("exports semester bounds, holiday exclusions and a detached override using the same recurrence UID", () => {
    const s = state(),
      n = s.profiles.find((p) => p.id === N)!;
    n.schedule = {
      holiday_policy: "skip",
      travel_minutes: 0,
      holidays: [{ date: "2026-11-12", name: "Feriado" }],
    };
    s.recurrentClasses[0].exceptions = [
      {
        date: day,
        action: "override",
        classroom: "L-8",
        professor: "Suplente",
      },
      { date: "2026-11-19", action: "cancel" },
    ];
    const ics = generateIcsCalendarContent(
      s.subjects,
      s.recurrentClasses,
      [],
      new Date(iso("07:00")),
      s.profiles,
    ).replace(/\r\n /g, "");
    expect(ics).toContain("UNTIL=20270101T045900Z");
    expect(ics).toContain("EXDATE:20261112T150000Z");
    expect(ics).toContain("EXDATE:20261119T150000Z");
    expect(ics).toContain("RECURRENCE-ID:20261105T150000Z");
    expect(ics).toContain("LOCATION:L-8");
  });
});

describe("Travel time between commitments", () => {
  it("reserves one configured gap, keeps actual class times, and respects exact boundaries", () => {
    const s = state(),
      n = s.profiles.find((p) => p.id === N)!;
    n.schedule = { ...profileSchedule(n), travel_minutes: 30 };
    const [busy] = busyForDay(s, day, N);
    expect(busy).toMatchObject({
      start: Date.parse(iso("09:30")),
      end: Date.parse(iso("12:30")),
      eventStart: Date.parse(iso("10:00")),
      eventEnd: Date.parse(iso("12:00")),
    });
    expect(
      sharedPlanConflicts(
        s,
        activity({ start_datetime: iso("12:15"), end_datetime: iso("13:15") }),
      ),
    ).toHaveLength(1);
    expect(
      sharedPlanConflicts(
        s,
        activity({ start_datetime: iso("12:30"), end_datetime: iso("13:30") }),
      ),
    ).toEqual([]);
    expect(
      commonFreeWindows(
        [busy],
        Date.parse(iso("12:00")),
        Date.parse(iso("14:00")),
        60,
      )[0].start,
    ).toBe(Date.parse(iso("12:30")));
  });
  it("carries a previous day's travel margin across midnight without shifting the original event", () => {
    const s = emptySnapshot(),
      g = s.profiles.find((p) => p.id === G)!;
    // Avoid mutating DEFAULT_PROFILES through the empty snapshot.
    s.profiles = s.profiles.map((p) =>
      p.id === G
        ? {
            ...p,
            schedule: {
              holiday_policy: "skip",
              holidays: [],
              travel_minutes: 30,
            },
          }
        : p,
    );
    s.activities = [
      activity({
        start_datetime: iso("22:00", "2026-11-04"),
        end_datetime: iso("23:50", "2026-11-04"),
        is_shared: false,
        invitation: null,
      }),
    ];
    expect(busyForDay(s, day, G)[0]).toMatchObject({
      start: dayStart(day),
      end: Date.parse(iso("00:20")),
      title: "Traslado · Cita",
    });
  });
});

describe("Backup restore preview", () => {
  it("detects duplicates with different IDs and remaps their lab and activity to the existing course", () => {
    const current = state(),
      backup = state();
    const originalId = backup.subjects[0].id;
    backup.subjects[0].id = crypto.randomUUID();
    backup.recurrentClasses[0].id = crypto.randomUUID();
    backup.recurrentClasses[0].subject_id = backup.subjects[0].id;
    backup.activities = [
      activity({
        profile_id: N,
        subject_id: backup.subjects[0].id,
        is_shared: false,
        invitation: null,
      }),
    ];
    const preview = buildRestorePreview(backup, current, N);
    expect(preview.rows.filter((r) => r.status === "duplicate")).toHaveLength(
      2,
    );
    expect(preview.mutations).toHaveLength(1);
    expect(preview.mutations[0].record.subject_id).toBe(originalId);
  });
  it("preserves differing records and skips a shared invitation that conflicts with a lab", () => {
    const current = state(),
      backup = state();
    backup.subjects[0].professor = "Otro docente";
    backup.activities = [
      activity({ start_datetime: iso("10:00"), end_datetime: iso("11:00") }),
    ];
    const preview = buildRestorePreview(backup, current, G);
    expect(preview.mutations).toEqual([]);
    expect(preview.rows.filter((r) => r.status === "conflict")).toHaveLength(2);
    expect(
      preview.rows.find((r) => r.table === "activities")?.reason,
    ).toContain("Física");
  });
  it("recovers missing courses, exceptions and accepted invitations in one validated create-only batch", () => {
    const backup = state();
    backup.recurrentClasses[0].exceptions = [{ date: day, action: "cancel" }];
    backup.activities = [
      activity({
        invitation: {
          recipient_id: N,
          status: "accepted",
          responded_at: iso("08:00"),
        },
      }),
    ];
    const preview = buildRestorePreview(
      backup,
      normalizeSnapshot(emptySnapshot()),
      G,
    );
    const checked = validateBatch(
      {
        id: crypto.randomUUID(),
        actor: G,
        purpose: "restore",
        mutations: preview.mutations,
      },
      emptySnapshot(),
    );
    const recovered = applyMutations(emptySnapshot(), checked.mutations);
    expect(recovered.activities[0].invitation?.status).toBe("accepted");
    expect(recovered.recurrentClasses[0].exceptions).toHaveLength(1);
    expect(preview.mutations.every((m) => m.create_only)).toBe(true);
  });
  it("rejects a stale create-only restore rather than overwriting another device's row", () => {
    const backup = state(),
      preview = buildRestorePreview(
        backup,
        normalizeSnapshot(emptySnapshot()),
        N,
      );
    expect(() =>
      validateBatch(
        {
          id: crypto.randomUUID(),
          actor: N,
          purpose: "restore",
          mutations: preview.mutations,
        },
        backup,
      ),
    ).toThrow("ya existe");
  });
  it("rejects malformed JSON, unsupported versions, duplicate IDs and impossible dates", () => {
    expect(() => parseBackup("{bad}")).toThrow("JSON");
    expect(() =>
      parseBackup(JSON.stringify({ version: 99, snapshot: state() })),
    ).toThrow("inválido");
    const bad = state();
    bad.subjects.push({ ...bad.subjects[0] });
    expect(() =>
      parseBackup(JSON.stringify({ version: 4, snapshot: bad })),
    ).toThrow("repetidos");
    const invalid = state();
    invalid.subjects[0].term!.start_date = "2026-02-30";
    expect(() =>
      parseBackup(JSON.stringify({ version: 4, snapshot: invalid })),
    ).toThrow("Fecha inválida");
  });
  it("reads official v4 backups and ignores context fields when checking whether the preview is stale", () => {
    const s = state();
    expect(
      parseBackup(JSON.stringify({ version: 4, snapshot: s })).subjects,
    ).toHaveLength(1);
    expect(snapshotKey({ ...s, syncStatus: "saved" } as typeof s)).toBe(
      snapshotKey(s),
    );
  });
});

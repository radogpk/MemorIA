import { describe, it, expect } from "vitest";
import {
  DEFAULT_PROFILES,
  GERARDO_PROFILE_ID,
  EVEBEBE_PROFILE_ID,
} from "@/lib/supabase/data";
import {
  projectRecurrentClassesForRange,
  formatActivitiesToCalendarEvents,
} from "@/lib/calendar/projection";
import type { RecurrentClass, Activity, Subject } from "@/types/database.types";

describe("Duo & Couple Management Engine", () => {
  const mockSubjectGerardo: Subject = {
    id: "sub-gerardo",
    user_id: "default-user",
    profile_id: GERARDO_PROFILE_ID,
    name: "Inteligencia Artificial",
    code: "IA-301",
    color: "#8b5cf6",
    professor: "Dr. Turing",
    classroom: "H-205",
    is_active: true,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };

  const mockClassGerardo: RecurrentClass = {
    id: "rec-gerardo",
    user_id: "default-user",
    profile_id: GERARDO_PROFILE_ID,
    subject_id: "sub-gerardo",
    day_of_week: 1, // Lunes
    start_time: "08:00",
    end_time: "10:00",
    classroom: "H-205",
    created_at: "2026-09-01T00:00:00Z",
    subject: mockSubjectGerardo,
  };

  const mockSubjectEvebebe: Subject = {
    id: "sub-evebebe",
    user_id: "default-user",
    profile_id: EVEBEBE_PROFILE_ID,
    name: "Diseño UX/UI",
    code: "UX-101",
    color: "#ec4899",
    professor: "Prof. Norman",
    classroom: "Lab 3",
    is_active: true,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };

  const mockClassEvebebe: RecurrentClass = {
    id: "rec-evebebe",
    user_id: "default-user",
    profile_id: EVEBEBE_PROFILE_ID,
    subject_id: "sub-evebebe",
    day_of_week: 1, // Lunes
    start_time: "10:00",
    end_time: "12:00",
    classroom: "Lab 3",
    created_at: "2026-09-01T00:00:00Z",
    subject: mockSubjectEvebebe,
  };

  const mockActivities: Activity[] = [
    {
      id: "act-gerardo",
      user_id: "default-user",
      profile_id: GERARDO_PROFILE_ID,
      subject_id: "sub-gerardo",
      title: "Estudiar IA",
      description: null,
      type: "task",
      status: "pending",
      start_datetime: "2026-09-21T14:00:00Z",
      end_datetime: "2026-09-21T15:00:00Z",
      is_all_day: false,
      priority: "medium",
      is_shared: false,
      metadata: {},
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
    {
      id: "act-evebebe",
      user_id: "default-user",
      profile_id: EVEBEBE_PROFILE_ID,
      subject_id: "sub-evebebe",
      title: "Entrega Figma",
      description: null,
      type: "task",
      status: "pending",
      start_datetime: "2026-09-21T16:00:00Z",
      end_datetime: "2026-09-21T17:00:00Z",
      is_all_day: false,
      priority: "high",
      is_shared: false,
      metadata: {},
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
    {
      id: "act-cita",
      user_id: "default-user",
      profile_id: GERARDO_PROFILE_ID,
      subject_id: null,
      title: "💖 Cita en Pareja",
      description: "Cena juntos",
      type: "personal",
      status: "pending",
      start_datetime: "2026-09-21T20:00:00Z",
      end_datetime: "2026-09-21T22:00:00Z",
      is_all_day: false,
      priority: "high",
      is_shared: true,
      metadata: {},
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    },
  ];

  it("should preserve names, nicknames and stable identities for both profiles", () => {
    expect(DEFAULT_PROFILES).toHaveLength(2);
    expect(DEFAULT_PROFILES[0].id).toBe(GERARDO_PROFILE_ID);
    expect(DEFAULT_PROFILES[0].name).toBe("Gerardo");
    expect(DEFAULT_PROFILES[0].role).toBe("owner");
    expect(DEFAULT_PROFILES[1].id).toBe(EVEBEBE_PROFILE_ID);
    expect(DEFAULT_PROFILES[1].name).toBe("Norely");
    expect(DEFAULT_PROFILES[1].nickname).toBe("Evebebé");
    expect(DEFAULT_PROFILES[1].role).toBe("partner");
  });

  it("should preserve profileId and isShared on projected classes and activities", () => {
    const rangeStart = new Date("2026-09-21T00:00:00");
    const rangeEnd = new Date("2026-09-27T23:59:59");

    const projected = projectRecurrentClassesForRange(
      [mockClassGerardo, mockClassEvebebe],
      rangeStart,
      rangeEnd,
    );
    expect(projected).toHaveLength(2);
    expect(projected[0].profileId).toBe(GERARDO_PROFILE_ID);
    expect(projected[1].profileId).toBe(EVEBEBE_PROFILE_ID);

    const formatted = formatActivitiesToCalendarEvents(mockActivities);
    expect(formatted).toHaveLength(3);
    expect(formatted[0].profileId).toBe(GERARDO_PROFILE_ID);
    expect(formatted[0].isShared).toBe(false);
    expect(formatted[1].profileId).toBe(EVEBEBE_PROFILE_ID);
    expect(formatted[2].isShared).toBe(true);
  });

  it("should correctly filter events in mine, partner, and both modes", () => {
    const rangeStart = new Date("2026-09-21T00:00:00");
    const rangeEnd = new Date("2026-09-27T23:59:59");

    const projected = projectRecurrentClassesForRange(
      [mockClassGerardo, mockClassEvebebe],
      rangeStart,
      rangeEnd,
    );
    const formatted = formatActivitiesToCalendarEvents(mockActivities);
    const all = [...projected, ...formatted];

    // Mode 'both'
    expect(all).toHaveLength(5);

    // Mode 'mine' (Gerardo + shared)
    const mineEvents = all.filter((e) => {
      const pid = e.profileId || e.subject?.profile_id;
      return pid === GERARDO_PROFILE_ID || e.isShared;
    });
    expect(mineEvents.map((e) => e.id)).toEqual(
      expect.arrayContaining([
        "act-gerardo",
        "act-cita",
        expect.stringContaining("rec-gerardo"),
      ]),
    );
    expect(mineEvents.some((e) => e.id === "act-evebebe")).toBe(false);

    // Mode 'partner' (Evebebé + shared)
    const partnerEvents = all.filter((e) => {
      const pid = e.profileId || e.subject?.profile_id;
      return pid === EVEBEBE_PROFILE_ID || e.isShared;
    });
    expect(partnerEvents.map((e) => e.id)).toEqual(
      expect.arrayContaining([
        "act-evebebe",
        "act-cita",
        expect.stringContaining("rec-evebebe"),
      ]),
    );
    expect(partnerEvents.some((e) => e.id === "act-gerardo")).toBe(false);
  });
});

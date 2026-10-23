import { describe, expect, it } from "vitest";
import { emptySnapshot, normalizeSnapshot } from "@/lib/storage/model";
import { validateBatch } from "@/lib/storage/validation";
import { GERARDO_PROFILE_ID as G } from "@/lib/supabase/data";

const course = {
  id: crypto.randomUUID(), profile_id: G, name: "Legacy course", code: null,
  professor: null, classroom: null, color: "#97c7e7", is_active: true,
  created_at: "2026-10-23T12:00:00.000Z", updated_at: "2026-10-23T12:00:00.000Z",
};

describe("legacy course holiday defaults", () => {
  it("normalizes an older backup without changing its identity or profile", () => {
    const snapshot = normalizeSnapshot({ ...emptySnapshot(), subjects: [course] });
    expect(snapshot.subjects[0]).toMatchObject({
      id: course.id, profile_id: G, holiday_policy: "inherit",
    });
  });

  it.each([undefined, "inherit", "skip", "attend"] as const)(
    "validates pending browser batches with policy %s", (holiday_policy) => {
      const batch = validateBatch({
        id: crypto.randomUUID(), actor: G,
        mutations: [{
          id: crypto.randomUUID(), table: "subjects", action: "upsert",
          record: { ...course, holiday_policy },
        }],
      }, emptySnapshot());
      expect(batch.mutations[0].record.holiday_policy).toBe(holiday_policy ?? "inherit");
    },
  );
});

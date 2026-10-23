import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readDatabase, writeDatabase } from "@/lib/storage/database";
import { stableUuid } from "@/lib/storage/model";
import {
  GERARDO_PROFILE_ID as G,
  EVEBEBE_PROFILE_ID as E,
} from "@/lib/supabase/data";
const directory = mkdtempSync(path.join(tmpdir(), "memoria-db-"));
process.env.MEMORIA_DATA_DIR = directory;
process.env.MEMORIA_STORAGE = "sqlite";
const now = new Date().toISOString();
const batch = (table: string, record: object, actor = G) => ({
  id: crypto.randomUUID(),
  actor,
  mutations: [{ id: crypto.randomUUID(), table, action: "upsert", record }],
});
describe("Persistent transactional database", () => {
  it("stores a course and lab atomically, reads them back and replays without duplicates", async () => {
    const id = stableUuid("test-course");
    const lab = stableUuid("test-lab");
    const record = {
      id,
      profile_id: G,
      name: "Course",
      code: null,
      color: "#7cb8df",
      professor: "Theory",
      classroom: "A-1",
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    const b = batch("subjects", record);
    b.mutations.push({
      id: crypto.randomUUID(),
      table: "recurrentClasses",
      action: "upsert",
      record: {
        id: lab,
        profile_id: G,
        subject_id: id,
        day_of_week: 1,
        start_time: "08:00",
        end_time: "10:00",
        session_type: "laboratory",
        professor: "Lab teacher",
        classroom: "L-1",
        created_at: now,
      },
    });
    await writeDatabase(b);
    await writeDatabase(b);
    const stored = await readDatabase();
    expect(stored.subjects).toHaveLength(1);
    expect(stored.recurrentClasses[0].professor).toBe("Lab teacher");
    const invalid = batch("subjects", {
      ...record,
      id: stableUuid("rolled-back"),
    });
    invalid.mutations.push({
      id: crypto.randomUUID(),
      table: "recurrentClasses",
      action: "upsert",
      record: {
        id: stableUuid("invalid-lab"),
        profile_id: G,
        subject_id: stableUuid("absent"),
        day_of_week: 1,
        start_time: "08:00",
        end_time: "10:00",
        classroom: null,
        created_at: now,
      },
    });
    await expect(writeDatabase(invalid)).rejects.toThrow();
    expect((await readDatabase()).subjects).toHaveLength(1);
  });
  it("accepts only the recipient’s response and survives an idempotent network retry", async () => {
    const id = stableUuid("test-invitation");
    const a = {
      id,
      profile_id: G,
      subject_id: null,
      title: "Dinner",
      description: null,
      type: "personal",
      status: "pending",
      start_datetime: "2026-11-05T20:00:00.000Z",
      end_datetime: null,
      is_all_day: false,
      priority: "medium",
      is_shared: true,
      metadata: {},
      created_at: now,
      updated_at: now,
      invitation: { recipient_id: E, status: "pending", responded_at: null },
    };
    await writeDatabase(batch("activities", a));
    await writeDatabase(
      batch("activities", {
        ...a,
        invitation: { ...a.invitation, status: "accepted" },
      }),
    );
    expect(
      (await readDatabase()).activities.find((row) => row.id === id)?.invitation
        ?.status,
    ).toBe("pending");
    const response = batch(
      "activities",
      {
        ...a,
        invitation: { ...a.invitation, status: "accepted" },
      },
      E,
    );
    await writeDatabase(response);
    await writeDatabase(response);
    const result = (await readDatabase()).activities.find((a) => a.id === id)!;
    expect(result.title).toBe("Dinner");
    expect(result.invitation?.status).toBe("accepted");
    await writeDatabase(
      batch("activities", {
        ...a,
        start_datetime: "2026-11-06T20:00:00.000Z",
        invitation: result.invitation,
      }),
    );
    await expect(
      writeDatabase(
        batch(
          "activities",
          { ...a, invitation: { ...a.invitation, status: "accepted" } },
          E,
        ),
      ),
    ).rejects.toThrow("invitación cambió");
  });
  it("rejects a second simultaneous proposal for an already reserved shared hour", async () => {
    const record = {
      id: crypto.randomUUID(),
      profile_id: G,
      subject_id: null,
      title: "First proposal",
      description: null,
      type: "personal",
      status: "pending",
      start_datetime: "2027-01-10T20:00:00.000Z",
      end_datetime: "2027-01-10T21:00:00.000Z",
      is_all_day: false,
      priority: "medium",
      is_shared: true,
      metadata: {},
      created_at: now,
      updated_at: now,
      invitation: { recipient_id: E, status: "pending", responded_at: null },
    };
    const second = {
      ...record,
      id: crypto.randomUUID(),
      profile_id: E,
      title: "Second proposal",
      invitation: { ...record.invitation, recipient_id: G },
    };
    const results = await Promise.allSettled([
      writeDatabase(batch("activities", record)),
      writeDatabase(batch("activities", second, E)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const saved = (await readDatabase()).activities.filter((a) =>
      [record.id, second.id].includes(a.id),
    );
    expect(saved).toHaveLength(1);
  });
});
// SQLite stays open for the test process; remove only this verified temporary directory.
afterAll(() => {
  if (
    path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) ||
    !path.basename(directory).startsWith("memoria-db-")
  )
    throw new Error("Unexpected test directory.");
  try {
    rmSync(directory, { recursive: true, force: true });
  } catch {
    /* Windows holds the DB until the process exits. */
  }
});

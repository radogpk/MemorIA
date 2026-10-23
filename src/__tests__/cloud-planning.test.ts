import { beforeAll, describe, expect, it } from "vitest";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  emptySnapshot,
  counterProposal,
  respondToInvitation,
} from "@/lib/storage/model";
import type { Activity } from "@/types/database.types";
import {
  GERARDO_PROFILE_ID as G,
  EVEBEBE_PROFILE_ID as N,
} from "@/lib/supabase/data";

// Opt in only against the dedicated disposable local database. Never touches Supabase.
const port = process.env.MEMORIA_TEST_POSTGRES_PORT;
const psql = process.env.MEMORIA_TEST_PSQL || "psql";
const args = [
  "-X",
  "-h",
  "127.0.0.1",
  "-p",
  port || "55442",
  "-U",
  "memoria_test",
  "-d",
  "memoria_planning_test",
  "-v",
  "ON_ERROR_STOP=1",
  "-A",
  "-t",
];
const run = (sql: string) =>
  execFileSync(psql, args, {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
const json = (value: unknown) =>
  `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
const send = (batch: unknown) =>
  JSON.parse(run(`SELECT memoria_apply_batch(${json(batch)});`));
const batch = (record: object, actor = G, extra = {}) => ({
  id: crypto.randomUUID(),
  actor,
  mutations: [
    {
      id: crypto.randomUUID(),
      table: "activities",
      action: "upsert",
      record,
      ...extra,
    },
  ],
});
const time = "2032-11-04"; // Thursday.
const now = "2032-01-01T12:00:00.000Z";
const activity = (input: Partial<Activity> = {}): Activity => ({
  id: crypto.randomUUID(),
  profile_id: G,
  subject_id: null,
  title: "SQL fixture",
  description: null,
  type: "personal",
  status: "pending",
  start_datetime: `${time}T20:00:00.000Z`,
  end_datetime: `${time}T21:00:00.000Z`,
  is_all_day: false,
  priority: "medium",
  is_shared: true,
  invitation: { recipient_id: N, status: "pending", responded_at: null },
  metadata: {},
  created_at: now,
  updated_at: now,
  ...input,
});
describe.skipIf(!port)("PostgreSQL planning migration and transaction", () => {
  beforeAll(() => {
    if (!/^\d{4,5}$/.test(port || "") || port === "5432")
      throw new Error("Use a separate test PostgreSQL port.");
    run(
      "DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$; DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$; DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
    );
    for (const file of [
      "supabase/schema.sql",
      "supabase/migrations/20261022_reliable_storage.sql",
      "supabase/migrations/20261023_norely_profile.sql",
      "supabase/migrations/20261023_planning_upgrades.sql",
    ])
      run(readFileSync(file, "utf8"));
    // Reapplying the feature migration must preserve all rows and definitions.
    run(
      readFileSync(
        "supabase/migrations/20261023_planning_upgrades.sql",
        "utf8",
      ),
    );
    // Only this fixed disposable database on the explicitly opted-in local port.
    run(
      "TRUNCATE activities,recurrent_classes,subjects,memoria_batches CASCADE;",
    );
  }, 60000);
  it("persists counterproposals with the same ID and lets the original owner confirm", () => {
    const a = activity();
    send(batch(a));
    const alternative = counterProposal(
      a,
      N,
      `${time}T22:00:00.000Z`,
      `${time}T23:00:00.000Z`,
    );
    const after = send(
      batch(alternative, N, {
        intent: "counterproposal",
        expected_updated_at: a.updated_at,
      }),
    );
    const saved = after.activities.find((row: Activity) => row.id === a.id);
    expect(saved.invitation).toMatchObject({
      proposed_by: N,
      recipient_id: G,
      status: "pending",
    });
    const accepted = send(
      batch(respondToInvitation(saved, G, "accepted"), G, {
        expected_updated_at: saved.updated_at,
      }),
    );
    expect(
      accepted.activities.find((row: Activity) => row.id === a.id).invitation
        .status,
    ).toBe("accepted");
  });
  it("rejects stale writes and rolls back all new rows when create-only restore collides", () => {
    const a = activity({
      start_datetime: "2033-01-01T20:00:00.000Z",
      end_datetime: "2033-01-01T21:00:00.000Z",
    });
    send(batch(a));
    expect(() =>
      send(
        batch({ ...a, title: "Stale title" }, G, {
          expected_updated_at: "2000-01-01T00:00:00Z",
        }),
      ),
    ).toThrow();
    const fresh = activity({
      start_datetime: "2033-01-02T20:00:00.000Z",
      end_datetime: "2033-01-02T21:00:00.000Z",
    });
    const restore = {
      ...batch(fresh, G, { create_only: true }),
      purpose: "restore",
    };
    restore.mutations.push({
      ...restore.mutations[0],
      id: crypto.randomUUID(),
      record: a,
    });
    expect(() => send(restore)).toThrow();
    expect(run(`SELECT count(*) FROM activities WHERE id='${fresh.id}';`)).toBe(
      "0",
    );
  });
  it("uses the profile's holiday rule, course override, dated exception and term bounds", () => {
    const course = crypto.randomUUID(),
      lab = crypto.randomUUID();
    const n = emptySnapshot().profiles.find((p) => p.id === N)!;
    send({
      id: crypto.randomUUID(),
      actor: N,
      mutations: [
        {
          id: crypto.randomUUID(),
          table: "profiles",
          action: "upsert",
          record: {
            ...n,
            schedule: {
              holiday_policy: "attend",
              holidays: [{ date: time, name: "Fixture holiday" }],
              travel_minutes: 30,
            },
          },
        },
        {
          id: crypto.randomUUID(),
          table: "subjects",
          action: "upsert",
          record: {
            id: course,
            profile_id: N,
            name: "Fixture lab course",
            code: null,
            color: "#97c7e7",
            professor: null,
            classroom: null,
            is_active: true,
            created_at: now,
            updated_at: now,
            term: {
              name: "2032-II",
              start_date: "2032-09-01",
              end_date: "2032-12-31",
            },
            holiday_policy: "inherit",
          },
        },
        {
          id: crypto.randomUUID(),
          table: "recurrentClasses",
          action: "upsert",
          record: {
            id: lab,
            profile_id: N,
            subject_id: course,
            day_of_week: 4,
            start_time: "10:00",
            end_time: "12:00",
            classroom: "L-1",
            session_type: "laboratory",
            created_at: now,
            exceptions: [],
          },
        },
      ],
    });
    expect(
      run(
        `SELECT count(*) FROM memoria_busy_periods('${time}','${N}',NULL) WHERE title='Fixture lab course';`,
      ),
    ).toBe("1");
    run(`UPDATE subjects SET holiday_policy='skip' WHERE id='${course}';`);
    expect(
      run(
        `SELECT count(*) FROM memoria_busy_periods('${time}','${N}',NULL) WHERE title='Fixture lab course';`,
      ),
    ).toBe("0");
    run(
      `UPDATE recurrent_classes SET exceptions='[{"date":"${time}","action":"override","start_time":"13:00","end_time":"14:00","classroom":"L-2","professor":"Substitute"}]'::jsonb WHERE id='${lab}';`,
    );
    expect(
      run(
        `SELECT starts AT TIME ZONE 'America/Lima' FROM memoria_busy_periods('${time}','${N}',NULL) WHERE title='Fixture lab course';`,
      ),
    ).toBe(`${time} 12:30:00`);
    expect(
      run(
        `SELECT count(*) FROM memoria_busy_periods('2033-01-06','${N}',NULL) WHERE title='Fixture lab course';`,
      ),
    ).toBe("0");
    const conflicting = activity({
      start_datetime: `${time}T19:15:00.000Z`,
      end_datetime: `${time}T20:15:00.000Z`,
    });
    expect(() => send(batch(conflicting))).toThrow();
  });
  it("serializes two competing proposals and accepts only one", async () => {
    const a = activity({
      start_datetime: "2034-01-01T20:00:00.000Z",
      end_datetime: "2034-01-01T21:00:00.000Z",
    });
    const b = {
      ...a,
      id: crypto.randomUUID(),
      title: "Second simultaneous proposal",
    };
    const concurrent = (record: Activity) =>
      new Promise<number>((resolve) => {
        const child = spawn(psql, args, {
          stdio: ["pipe", "ignore", "ignore"],
        });
        child.on("exit", (code) => resolve(code || 0));
        child.on("error", () => resolve(1));
        child.stdin.end(`SELECT memoria_apply_batch(${json(batch(record))});`);
      });
    const codes = await Promise.all([concurrent(a), concurrent(b)]);
    expect(codes.filter((code) => code === 0)).toHaveLength(1);
    expect(
      run(`SELECT count(*) FROM activities WHERE id IN ('${a.id}','${b.id}');`),
    ).toBe("1");
  });
});

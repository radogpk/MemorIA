import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { Snapshot, Batch, emptySnapshot, normalizeSnapshot } from "./model";
import { validateBatch, MutationValidationError } from "./validation";
import { notificationChanges } from "@/lib/push/model";

export const storageEngine = () =>
  process.env.MEMORIA_STORAGE || (process.env.VERCEL ? "supabase" : "sqlite");
let sqlite: DatabaseSync | undefined;
function db() {
  if (sqlite) return sqlite;
  const dir = process.env.MEMORIA_DATA_DIR || path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  sqlite = new DatabaseSync(path.join(dir, "memoria.sqlite"));
  sqlite.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS recurrentClasses (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id), subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS batches (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS push_devices (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id), endpoint TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS push_deliveries (id TEXT PRIMARY KEY, device_id TEXT NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE, job TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, available_at INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0);
  `);
  for (const p of emptySnapshot().profiles)
    sqlite
      .prepare("INSERT OR IGNORE INTO profiles (id,data) VALUES (?,?)")
      .run(p.id, JSON.stringify(p));
  return sqlite;
}

function readLocal(): Snapshot {
  const database = db();
  const read = (table: string) =>
    database
      .prepare(`SELECT data FROM ${table}`)
      .all()
      .map((row) => JSON.parse(row.data as string));
  return normalizeSnapshot({
    profiles: read("profiles"),
    subjects: read("subjects"),
    recurrentClasses: read("recurrentClasses"),
    activities: read("activities"),
  });
}

function cloud() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Configura la URL de Supabase y SUPABASE_SERVICE_ROLE_KEY en el servidor.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000),
          cache: "no-store",
        }),
    },
  });
}
export const localDatabase = db;
export const cloudClient = cloud;

export async function readDatabase(): Promise<Snapshot> {
  if (storageEngine() === "sqlite") return readLocal();
  const c = cloud();
  const { data, error } = await c.rpc("memoria_snapshot");
  if (error)
    throw new Error(
      `Supabase no disponible: ${error.message}. Revisa la conexión y aplica supabase/migrations/20261022_reliable_storage.sql.`,
    );
  return normalizeSnapshot(data);
}

export async function writeDatabase(raw: unknown): Promise<Snapshot> {
  if (storageEngine() !== "sqlite") {
    const current = await readDatabase();
    const retryId = (raw as { id?: string })?.id;
    if (retryId) {
      const { data } = await cloud()
        .from("memoria_batches")
        .select("id")
        .eq("id", retryId)
        .maybeSingle();
      if (data) return current;
    }
    const batch = validateBatch(raw, current);
    const { data, error } = await cloud().rpc("memoria_apply_batch", { batch });
    if (error) {
      if (["P0001", "23505", "23514", "23503"].includes(error.code))
        throw new MutationValidationError(error.message);
      throw new Error(`No se guardó en Supabase: ${error.message}`);
    }
    return normalizeSnapshot(data);
  }
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const retryId = (raw as { id?: string })?.id;
    if (
      retryId &&
      database.prepare("SELECT id FROM batches WHERE id = ?").get(retryId)
    ) {
      database.exec("COMMIT");
      return readLocal();
    }
    const before = readLocal();
    const batch: Batch = validateBatch(raw, before);
    if (
      !database.prepare("SELECT id FROM batches WHERE id = ?").get(batch.id)
    ) {
      for (const op of batch.mutations) {
        if (op.action === "delete") {
          if (op.table === "subjects") {
            // Retain assignments and personal notes when removing a course.
            for (const a of readLocal().activities.filter(
              (a) => a.subject_id === op.record.id,
            )) {
              database
                .prepare("UPDATE activities SET data = ? WHERE id = ?")
                .run(
                  JSON.stringify({
                    ...a,
                    subject_id: null,
                    subject: undefined,
                  }),
                  a.id,
                );
            }
          }
          database
            .prepare(`DELETE FROM ${op.table} WHERE id = ?`)
            .run(op.record.id);
        } else {
          const r = op.record;
          const columns =
            op.table === "profiles"
              ? ["id", "data"]
              : op.table === "recurrentClasses"
                ? ["id", "profile_id", "subject_id", "data"]
                : ["id", "profile_id", "data"];
          const values = columns.map((k) =>
            k === "data" ? JSON.stringify(r) : String(r[k]),
          );
          database
            .prepare(
              `INSERT INTO ${op.table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${columns
                .slice(1)
                .map((k) => `${k}=excluded.${k}`)
                .join(",")}`,
            )
            .run(...values);
        }
      }
      database
        .prepare("INSERT INTO batches (id,created_at) VALUES (?,?)")
        .run(batch.id, new Date().toISOString());
      const jobs = notificationChanges(before, readLocal());
      const devices = database
        .prepare("SELECT id,profile_id FROM push_devices")
        .all();
      const enqueue = database.prepare(
        "INSERT OR IGNORE INTO push_deliveries (id,device_id,job) VALUES (?,?,?)",
      );
      for (const job of jobs)
        for (const device of devices)
          if (device.profile_id === job.profile_id)
            enqueue.run(
              `${job.id}:${device.id}`,
              String(device.id),
              JSON.stringify(job),
            );
    }
    database.exec("COMMIT");
    return readLocal();
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

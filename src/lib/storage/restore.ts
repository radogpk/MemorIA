import { z } from "zod";
import { entitySchemas, validateBatch } from "./validation";
import {
  applyMutations,
  flatRecord,
  normalizeSnapshot,
  type Mutation,
  type Snapshot,
  type EntityTable,
} from "./model";

const tables = ["subjects", "recurrentClasses", "activities"] as const;
const backupSchema = z.object({
  version: z.union([z.literal(4), z.literal(5)]),
  snapshot: z.object({
    profiles: z.array(entitySchemas.profiles).min(1).max(2),
    subjects: z.array(entitySchemas.subjects).max(5000),
    recurrentClasses: z.array(entitySchemas.recurrentClasses).max(10000),
    activities: z.array(entitySchemas.activities).max(20000),
  }),
});
export type RestoreRow = {
  table: EntityTable;
  title: string;
  status: "restore" | "duplicate" | "conflict";
  reason?: string;
};
export interface RestorePreview {
  backup: Snapshot;
  baseKey: string;
  rows: RestoreRow[];
  mutations: Mutation[];
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
const meaningful = (record: object) =>
  Object.fromEntries(
    Object.entries(record).filter(
      ([key]) =>
        !["id", "created_at", "updated_at", "subject", "user_id"].includes(key),
    ),
  );
const key = (value: unknown) => JSON.stringify(canonical(value));
export const snapshotKey = (snapshot: Snapshot) =>
  key(
    Object.fromEntries(
      (["profiles", ...tables] as const).map((table) => [
        table,
        snapshot[table]
          .map((r) => flatRecord(r))
          .sort((a, b) => a.id.localeCompare(b.id)),
      ]),
    ),
  );
const text = (value: unknown) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
function logicalKey(table: EntityTable, r: Record<string, unknown>) {
  if (table === "subjects")
    return key([r.profile_id, text(r.name), text(r.code), r.term || null]);
  if (table === "recurrentClasses")
    return key([
      r.profile_id,
      r.subject_id,
      r.day_of_week,
      String(r.start_time).slice(0, 5),
      String(r.end_time).slice(0, 5),
      r.session_type || "theory",
    ]);
  return key([
    r.profile_id,
    text(r.title),
    r.type,
    Date.parse(String(r.start_datetime)),
    r.end_datetime ? Date.parse(String(r.end_datetime)) : null,
  ]);
}
export function parseBackup(content: string): Snapshot {
  if (new TextEncoder().encode(content).length > 2_000_000)
    throw new Error("El respaldo supera 2 MB. Usa un archivo más pequeño.");
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error(
      "El archivo no contiene JSON válido. Elige un respaldo descargado desde memorIA.",
    );
  }
  const result = backupSchema.safeParse(raw);
  if (!result.success)
    throw new Error(
      `Respaldo inválido: ${result.error.issues[0]?.message || "faltan datos obligatorios"}`,
    );
  for (const table of ["profiles", ...tables] as const) {
    const ids = result.data.snapshot[table].map((r) => r.id);
    if (new Set(ids).size !== ids.length)
      throw new Error(
        "El respaldo contiene identificadores repetidos. No se ha modificado ningún dato.",
      );
  }
  return normalizeSnapshot(result.data.snapshot);
}
export function buildRestorePreview(
  backup: Snapshot,
  current: Snapshot,
  actor: string,
): RestorePreview {
  const allowedProfiles = new Set(current.profiles.map((p) => p.id));
  const rows: RestoreRow[] = [],
    mutations: Mutation[] = [];
  const subjectIds = new Map<string, string>();
  let working = current;
  for (const table of tables)
    for (const source of backup[table]) {
      const record = flatRecord(source);
      const title =
        table === "subjects"
          ? String(record.name)
          : table === "activities"
            ? String(record.title)
            : `${backup.subjects.find((s) => s.id === record.subject_id)?.name || "Curso"} · ${record.session_type === "laboratory" ? "Laboratorio" : record.session_type === "practice" ? "Práctica" : "Teoría"} ${record.start_time}–${record.end_time}`;
      const row: RestoreRow = { table, title, status: "restore" };
      rows.push(row);
      if (!allowedProfiles.has(String(record.profile_id))) {
        row.status = "conflict";
        row.reason = "El perfil no pertenece a este espacio.";
        continue;
      }
      if (record.subject_id) {
        const mapped =
          subjectIds.get(String(record.subject_id)) ||
          current.subjects.find(
            (s) =>
              s.id === record.subject_id && s.profile_id === record.profile_id,
          )?.id;
        if (!mapped) {
          row.status = "conflict";
          row.reason = "No se puede recuperar sin su curso.";
          continue;
        }
        record.subject_id = mapped;
      }
      const existing = working[table]
        .map((r) => flatRecord(r))
        .find(
          (r) =>
            r.id === record.id ||
            logicalKey(table, r) === logicalKey(table, record),
        );
      if (existing) {
        row.status =
          key(meaningful(existing)) === key(meaningful(record))
            ? "duplicate"
            : "conflict";
        row.reason =
          row.status === "duplicate"
            ? "Ya está en el espacio, aunque tenga otro identificador."
            : "Tiene datos diferentes. Se conserva la versión actual.";
        if (table === "subjects" && existing.profile_id === record.profile_id)
          subjectIds.set(record.id, existing.id);
        continue;
      }
      const mutation: Mutation = {
        id: crypto.randomUUID(),
        table,
        action: "upsert",
        create_only: true,
        record,
      };
      try {
        const checked = validateBatch(
          {
            id: crypto.randomUUID(),
            actor,
            purpose: "restore",
            mutations: [mutation],
          },
          working,
        );
        mutations.push(...checked.mutations);
        working = applyMutations(working, checked.mutations);
        if (table === "subjects") subjectIds.set(record.id, record.id);
      } catch (e) {
        row.status = "conflict";
        row.reason =
          e instanceof Error ? e.message : "No se pudo validar el registro.";
      }
    }
  if (mutations.length > 500)
    throw new Error(
      "Hay más de 500 registros nuevos. Esta restauración admite hasta 500 por archivo para guardarlos juntos de forma segura.",
    );
  return { backup, baseKey: snapshotKey(current), rows, mutations };
}

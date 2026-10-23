import { z } from "zod";
import {
  Batch,
  Snapshot,
  applyMutations,
  respondToInvitation,
  counterProposal,
  invitationSender,
} from "./model";
import { sharedPlanConflicts } from "@/lib/calendar/availability";
import { validDay } from "@/lib/calendar/academic";

const uuid = z.string().uuid();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const timestamp = z.string().datetime({ offset: true });
const base = { id: uuid, created_at: timestamp };
const day = z.string().refine(validDay, "Fecha inválida.");
const term = z
  .object({
    name: z.string().trim().min(1).max(60),
    start_date: day,
    end_date: day,
  })
  .refine(
    (t) => t.end_date >= t.start_date,
    "El fin del semestre debe ser posterior o igual a su inicio.",
  );
const exception = z.object({
  date: day,
  action: z.enum(["cancel", "override"]),
  start_time: time.optional(),
  end_time: time.optional(),
  classroom: z.string().max(100).nullable().optional(),
  professor: z.string().max(100).nullable().optional(),
  note: z.string().max(300).optional(),
});
export const entitySchemas = {
  profiles: z.object({
    ...base,
    name: z.string().trim().min(1).max(60),
    nickname: z.string().max(60).nullable().optional(),
    avatar_color: z.string().regex(/^#[\da-f]{6}$/i),
    role: z.enum(["owner", "partner", "user"]),
    schedule: z
      .object({
        holiday_policy: z.enum(["skip", "attend"]),
        travel_minutes: z.number().int().min(0).max(120),
        holidays: z
          .array(
            z.object({ date: day, name: z.string().trim().min(1).max(100) }),
          )
          .max(1500)
          .refine(
            (h) => new Set(h.map((v) => v.date)).size === h.length,
            "Ya hay un feriado en esa fecha.",
          ),
      })
      .optional(),
  }),
  subjects: z.object({
    ...base,
    profile_id: uuid,
    name: z.string().trim().min(1).max(100),
    code: z.string().max(20).nullable(),
    color: z.string().regex(/^#[\da-f]{6}$/i),
    professor: z.string().max(100).nullable(),
    classroom: z.string().max(100).nullable(),
    is_active: z.boolean(),
    updated_at: timestamp,
    term: term.nullable().optional(),
    holiday_policy: z.enum(["inherit", "skip", "attend"]).optional(),
  }),
  recurrentClasses: z
    .object({
      ...base,
      profile_id: uuid,
      subject_id: uuid,
      day_of_week: z.number().int().min(1).max(7),
      start_time: time,
      end_time: time,
      classroom: z.string().max(100).nullable(),
      professor: z.string().max(100).nullable().optional(),
      session_type: z
        .enum(["theory", "laboratory", "practice"])
        .default("theory"),
      exceptions: z.array(exception).max(1000).optional(),
    })
    .refine(
      (s) => s.end_time > s.start_time,
      "El fin debe ser posterior al inicio.",
    )
    .superRefine((c, ctx) => {
      const dates = new Set<string>();
      for (const e of c.exceptions || []) {
        if (dates.has(e.date))
          ctx.addIssue({
            code: "custom",
            message: "Solo puede haber un cambio por sesión y fecha.",
          });
        dates.add(e.date);
        if (
          (new Date(`${e.date}T12:00:00Z`).getUTCDay() || 7) !== c.day_of_week
        )
          ctx.addIssue({
            code: "custom",
            message: "El cambio debe caer en el día semanal de esta sesión.",
          });
        if (
          e.action === "override" &&
          (e.end_time || c.end_time) <= (e.start_time || c.start_time)
        )
          ctx.addIssue({
            code: "custom",
            message: "El fin de la sesión debe ser posterior al inicio.",
          });
      }
    }),
  activities: z
    .object({
      ...base,
      profile_id: uuid,
      subject_id: uuid.nullable(),
      title: z.string().trim().min(1).max(150),
      description: z.string().max(10000).nullable(),
      type: z.enum(["task", "exam", "meeting", "personal"]),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
      start_datetime: timestamp,
      end_datetime: timestamp.nullable(),
      is_all_day: z.boolean(),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      is_shared: z.boolean().default(false),
      metadata: z.record(z.unknown()),
      invitation: z
        .object({
          recipient_id: uuid,
          status: z.enum(["pending", "accepted", "declined"]),
          responded_at: timestamp.nullable(),
          proposed_by: uuid.optional(),
          previous_start: timestamp.optional(),
          previous_end: timestamp.nullable().optional(),
        })
        .nullable()
        .optional(),
      updated_at: timestamp,
    })
    .refine(
      (a) =>
        !a.end_datetime ||
        Date.parse(a.end_datetime) > Date.parse(a.start_datetime),
      "La fecha final debe ser posterior al inicio.",
    ),
};
const schemas = entitySchemas;
export const batchSchema = z.object({
  purpose: z.literal("restore").optional(),
  id: uuid,
  actor: uuid,
  mutations: z
    .array(
      z.object({
        id: uuid,
        table: z.enum([
          "profiles",
          "subjects",
          "recurrentClasses",
          "activities",
        ]),
        action: z.enum(["upsert", "delete"]),
        expected_updated_at: timestamp.optional(),
        intent: z.literal("counterproposal").optional(),
        create_only: z.boolean().optional(),
        record: z.object({ id: uuid }).passthrough(),
      }),
    )
    .min(1)
    .max(500),
});

export class MutationValidationError extends Error {}
function sameProposal(
  record: Record<string, unknown>,
  previous: Snapshot["activities"][number],
) {
  return (
    ["title", "description"].every(
      (key) => record[key] === previous[key as "title" | "description"],
    ) &&
    ["start_datetime", "end_datetime"].every((key) => {
      const before = previous[key as "start_datetime" | "end_datetime"];
      const after = record[key];
      return before == null || after == null
        ? before === after
        : Date.parse(before) === Date.parse(String(after));
    })
  );
}
export function validateBatch(raw: unknown, current: Snapshot): Batch {
  try {
    return validateBatchUnchecked(raw, current);
  } catch (e) {
    throw new MutationValidationError(
      e instanceof z.ZodError
        ? e.issues[0]?.message || "Revisa los datos del cambio."
        : e instanceof Error
          ? e.message
          : "Cambio inválido.",
    );
  }
}
function validateBatchUnchecked(raw: unknown, current: Snapshot): Batch {
  const batch = batchSchema.parse(raw);
  if (!current.profiles.some((p) => p.id === batch.actor))
    throw new Error("Perfil desconocido.");
  for (const op of batch.mutations) {
    if (op.table === "profiles" && op.action === "delete")
      throw new Error("Los perfiles del espacio no se eliminan.");
    if (op.create_only && current[op.table].some((r) => r.id === op.record.id))
      throw new Error(
        "Ese registro ya existe. Revisa de nuevo la vista previa del respaldo.",
      );
    if (
      batch.purpose === "restore" &&
      (op.table === "profiles" || !op.create_only || op.action !== "upsert")
    )
      throw new Error(
        "Una restauración solo puede recuperar registros que faltan.",
      );
    if (op.expected_updated_at && op.table === "activities") {
      const previous = current.activities.find((a) => a.id === op.record.id);
      if (
        !previous ||
        Date.parse(previous.updated_at) !== Date.parse(op.expected_updated_at)
      )
        throw new Error(
          "La actividad cambió en otro dispositivo. Actualiza la agenda y revisa el cambio otra vez.",
        );
    }
    if (op.action === "upsert") op.record = schemas[op.table].parse(op.record);
    if (
      op.action === "upsert" &&
      (op.table === "activities" || op.table === "recurrentClasses") &&
      op.record.subject_id
    ) {
      const pendingSubject = batch.mutations.find(
        (m) =>
          m.table === "subjects" &&
          m.action === "upsert" &&
          m.record.id === op.record.subject_id,
      )?.record;
      const subject =
        pendingSubject ||
        current.subjects.find((s) => s.id === op.record.subject_id);
      if (subject?.profile_id !== op.record.profile_id)
        throw new Error(
          "La actividad y su curso deben pertenecer al mismo perfil.",
        );
    }
    if (op.table === "activities") {
      const previous = current.activities.find((a) => a.id === op.record.id);
      if (op.intent === "counterproposal") {
        if (!previous || op.action !== "upsert")
          throw new Error("La invitación ya no existe.");
        op.record = schemas.activities.parse(
          counterProposal(
            previous,
            batch.actor,
            String(op.record.start_datetime),
            String(op.record.end_datetime),
          ),
        );
      } else if (
        previous?.invitation &&
        previous.invitation.recipient_id === batch.actor &&
        op.action === "upsert"
      ) {
        if (op.action !== "upsert")
          throw new Error("Solo quien invita puede eliminar la cita.");
        const response = op.record.invitation as
          { status?: string } | undefined;
        if (response?.status !== "accepted" && response?.status !== "declined")
          throw new Error("Respuesta inválida.");
        if (!sameProposal(op.record, previous))
          throw new Error(
            "La invitación cambió. Descarta esta respuesta y revisa la nueva propuesta.",
          );
        const allowed = respondToInvitation(
          previous,
          batch.actor,
          response.status,
        );
        op.record = schemas.activities.parse(allowed);
      } else if (
        previous?.invitation &&
        invitationSender(previous) !== batch.actor &&
        !(op.action === "delete" && previous.profile_id === batch.actor)
      ) {
        throw new Error(
          "Solo quien propuso el horario puede editarlo; el destinatario puede proponer otra hora.",
        );
      } else if (op.action === "upsert") {
        const invitation = op.record.invitation as {
          recipient_id: string;
          status: string;
        } | null;
        if (
          invitation &&
          (!current.profiles.some((p) => p.id === invitation.recipient_id) ||
            invitation.recipient_id ===
              ((op.record.invitation as { proposed_by?: string })
                ?.proposed_by || op.record.profile_id))
        )
          throw new Error("Elige otro perfil para la invitación.");
        if (
          !previous &&
          invitation?.status !== undefined &&
          invitation.status !== "pending" &&
          batch.purpose !== "restore"
        )
          throw new Error("Una invitación nueva debe estar pendiente.");
        if (invitation && previous?.invitation) {
          if (
            previous.invitation.proposed_by &&
            invitation.status !== previous.invitation.status &&
            invitation.status !== "pending"
          )
            throw new Error(
              "La invitación cambió. Solo quien debe responder puede confirmar el horario actual.",
            );
          if (op.record.profile_id !== previous.profile_id)
            throw new Error("La cita conserva el perfil que la creó.");
          const changed = !sameProposal(op.record, previous);
          op.record.invitation = changed
            ? { ...previous.invitation, status: "pending", responded_at: null }
            : previous.invitation;
        } else if (
          invitation &&
          invitation.status !== "pending" &&
          batch.purpose !== "restore"
        )
          throw new Error(
            "Solo el destinatario puede confirmar la invitación.",
          );
      }
    } else if (op.intent)
      throw new Error("Una contrapropuesta debe pertenecer a una invitación.");
  }
  const next = applyMutations(current, batch.mutations);
  for (const op of batch.mutations) {
    if (op.table !== "activities" || op.action !== "upsert") continue;
    const plan = next.activities.find((a) => a.id === op.record.id)!;
    const previous = current.activities.find((a) => a.id === plan.id);
    const rescheduled =
      !previous ||
      [
        "start_datetime",
        "end_datetime",
        "is_shared",
        "is_all_day",
        "status",
        "title",
        "description",
      ].some(
        (key) =>
          plan[key as keyof typeof plan] !== previous[key as keyof typeof plan],
      ) ||
      (previous.invitation?.status !== "accepted" &&
        plan.invitation?.status === "accepted");
    if (!rescheduled) continue;
    const conflict = sharedPlanConflicts(next, plan)[0];
    if (conflict) {
      const name =
        next.profiles.find((p) => p.id === conflict.profileId)?.name ||
        "El otro perfil";
      throw new Error(
        `${name} tiene «${conflict.period.title}» en ese horario. Busca otra hora en Invitaciones.`,
      );
    }
  }
  for (const s of next.subjects)
    if (!next.profiles.some((p) => p.id === s.profile_id))
      throw new Error("El curso necesita un perfil válido.");
  for (const c of next.recurrentClasses)
    if (
      !next.subjects.some(
        (s) => s.id === c.subject_id && s.profile_id === c.profile_id,
      )
    )
      throw new Error(
        "La sesión debe pertenecer al mismo perfil que el curso.",
      );
  for (const a of next.activities)
    if (
      !next.profiles.some((p) => p.id === a.profile_id) ||
      (a.subject_id &&
        !next.subjects.some(
          (s) => s.id === a.subject_id && s.profile_id === a.profile_id,
        ))
    )
      throw new Error(
        "La actividad y su curso deben pertenecer al mismo perfil.",
      );
  for (const a of next.activities)
    if (a.invitation) {
      const sender = invitationSender(a);
      if (
        !next.profiles.some((p) => p.id === sender) ||
        !next.profiles.some((p) => p.id === a.invitation!.recipient_id) ||
        sender === a.invitation.recipient_id ||
        ![sender, a.invitation.recipient_id].includes(a.profile_id!)
      )
        throw new Error("La invitación debe mantener a sus dos participantes.");
    }
  return batch;
}

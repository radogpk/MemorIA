import {
  Activity,
  RecurrentClass,
  Subject,
  UserProfile,
} from "@/types/database.types";
import {
  DEFAULT_PROFILES,
  GERARDO_PROFILE_ID,
  EVEBEBE_PROFILE_ID,
} from "@/lib/supabase/data";

export interface Snapshot {
  profiles: UserProfile[];
  subjects: Subject[];
  recurrentClasses: RecurrentClass[];
  activities: Activity[];
}
export type EntityTable =
  "profiles" | "subjects" | "recurrentClasses" | "activities";
export interface Mutation {
  intent?: "counterproposal";
  create_only?: boolean;
  expected_updated_at?: string;
  id: string;
  table: EntityTable;
  action: "upsert" | "delete";
  record: Record<string, unknown> & { id: string };
}
export interface Batch {
  purpose?: "restore";
  id: string;
  actor: string;
  mutations: Mutation[];
}
export const emptySnapshot = (): Snapshot => ({
  profiles: DEFAULT_PROFILES,
  subjects: [],
  recurrentClasses: [],
  activities: [],
});

// Stable IDs let the same legacy cache migrate twice without duplicating rows.
export function stableUuid(value: string): string {
  if (/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) return value;
  let hash = 2166136261;
  const hex = Array.from({ length: 4 }, (_, i) => {
    for (const c of value + i)
      hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    return (hash >>> 0).toString(16).padStart(8, "0");
  }).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}
const profileId = (id?: string | null) =>
  id === "prof-luis"
    ? GERARDO_PROFILE_ID
    : id === "prof-novia"
      ? EVEBEBE_PROFILE_ID
      : id;

export function normalizeSnapshot(input: Snapshot): Snapshot {
  const profiles = DEFAULT_PROFILES.map((base) => {
    const saved = input.profiles?.find((p) => p.id === base.id);
    const profile = saved ? { ...base, ...saved } : base;
    // Repair the old name in cached snapshots without changing identity or data.
    return profile.id === EVEBEBE_PROFILE_ID && profile.name === "Evebebé"
      ? { ...profile, name: "Norely", nickname: profile.nickname || "Evebebé" }
      : profile;
  });
  const subjects = (input.subjects || []).map((s) => ({
    ...s,
    id: stableUuid(s.id),
    user_id: undefined,
    profile_id: profileId(s.profile_id) || GERARDO_PROFILE_ID,
    holiday_policy: s.holiday_policy || "inherit",
  }));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const recurrentClasses = (input.recurrentClasses || []).map((c) => {
    const subject = subjectMap.get(stableUuid(c.subject_id));
    return {
      ...c,
      id: stableUuid(c.id),
      user_id: undefined,
      subject_id: stableUuid(c.subject_id),
      profile_id: subject?.profile_id || profileId(c.profile_id),
      session_type:
        c.session_type ||
        ((/\blab(?:oratorio)?\b/i.test(c.classroom || "")
          ? "laboratory"
          : "theory") as RecurrentClass["session_type"]),
      professor: c.professor || null,
      start_time: c.start_time.slice(0, 5),
      end_time: c.end_time.slice(0, 5),
      subject,
    };
  });
  const activities = (input.activities || []).map((a) => {
    const subject_id = a.subject_id ? stableUuid(a.subject_id) : null;
    const subject = subject_id ? subjectMap.get(subject_id) || null : null;
    return {
      ...a,
      id: stableUuid(a.id),
      user_id: undefined,
      subject_id,
      start_datetime: Number.isFinite(Date.parse(a.start_datetime))
        ? new Date(a.start_datetime).toISOString()
        : a.start_datetime,
      end_datetime:
        a.end_datetime && Number.isFinite(Date.parse(a.end_datetime))
          ? new Date(a.end_datetime).toISOString()
          : a.end_datetime,
      profile_id:
        subject?.profile_id || profileId(a.profile_id) || GERARDO_PROFILE_ID,
      subject,
    };
  });
  return { profiles, subjects, recurrentClasses, activities };
}

export function applyMutations(
  snapshot: Snapshot,
  mutations: Mutation[],
): Snapshot {
  const result = { ...snapshot };
  for (const op of mutations) {
    const rows = result[op.table] as Array<{ id: string }>;
    const next = rows.filter((r) => r.id !== op.record.id);
    if (op.action === "upsert") next.push(op.record);
    Object.assign(result, { [op.table]: next });
    if (op.table === "subjects" && op.action === "delete") {
      result.recurrentClasses = result.recurrentClasses.filter(
        (c) => c.subject_id !== op.record.id,
      );
      result.activities = result.activities.map((a) =>
        a.subject_id === op.record.id
          ? { ...a, subject_id: null, subject: null }
          : a,
      );
    }
  }
  return normalizeSnapshot(result);
}

export function isVisibleActivity(a: Activity, viewer: string): boolean {
  if (a.invitation?.status === "declined") return false;
  if (a.profile_id === viewer || a.invitation?.proposed_by === viewer)
    return true;
  if (a.invitation)
    return (
      a.invitation.recipient_id === viewer && a.invitation.status === "accepted"
    );
  return !!a.is_shared;
}

export const invitationSender = (a: Activity) =>
  a.invitation?.proposed_by || a.profile_id!;
export const invitationParticipants = (a: Activity) =>
  a.invitation
    ? [invitationSender(a), a.invitation.recipient_id]
    : [a.profile_id!];

/** A counterproposal updates the same event and switches who must confirm it. */
export function counterProposal(
  a: Activity,
  actor: string,
  start: string,
  end: string,
): Activity {
  if (!isPendingInvitation(a) || a.invitation!.recipient_id !== actor)
    throw new Error("Solo quien debe responder puede proponer otra hora.");
  if (
    Date.parse(start) === Date.parse(a.start_datetime) &&
    Date.parse(end) === Date.parse(a.end_datetime || "")
  )
    throw new Error("Elige una hora diferente a la propuesta actual.");
  return {
    ...a,
    start_datetime: start,
    end_datetime: end,
    updated_at: new Date().toISOString(),
    invitation: {
      proposed_by: actor,
      recipient_id: invitationSender(a),
      status: "pending",
      responded_at: null,
      previous_start: a.start_datetime,
      previous_end: a.end_datetime,
    },
  };
}

export function isPendingInvitation(a: Activity): boolean {
  return (
    a.invitation?.status === "pending" &&
    a.status !== "cancelled" &&
    a.status !== "completed"
  );
}

export function respondToInvitation(
  a: Activity,
  actor: string,
  status: "accepted" | "declined",
): Activity {
  if (
    !a.invitation ||
    a.invitation.recipient_id !== actor ||
    !isPendingInvitation(a)
  )
    throw new Error(
      "Solo el destinatario puede responder una invitación pendiente.",
    );
  return {
    ...a,
    invitation: {
      ...a.invitation,
      status,
      responded_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
}

export function flatRecord(
  record: object,
): Record<string, unknown> & { id: string } {
  const {
    subject: _subject,
    user_id: _user,
    ...flat
  } = record as Record<string, unknown>;
  return flat as Record<string, unknown> & { id: string };
}

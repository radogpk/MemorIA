"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  CreateActivityInput,
  CreateSubjectInput,
  RecurrentClass,
  UserProfile,
} from "@/types/database.types";
import { DuoViewMode } from "@/lib/calendar/types";
import { DEFAULT_PROFILES } from "@/lib/supabase/data";
import {
  Snapshot,
  Batch,
  Mutation,
  applyMutations,
  emptySnapshot,
  flatRecord,
  normalizeSnapshot,
  respondToInvitation,
  isVisibleActivity,
  counterProposal,
  invitationSender,
} from "./model";
import {
  buildRestorePreview,
  snapshotKey,
  type RestorePreview,
} from "./restore";
import { INITIAL_SUBJECTS, INITIAL_RECURRENT_CLASSES } from "./initial-data";
import { validateClassScheduleSlot } from "@/lib/actions/subjects-validation";
import { validateBatch } from "./validation";

export interface ScheduleInput {
  id?: string;
  exceptions?: RecurrentClass["exceptions"];
  day_of_week: number;
  start_time: string;
  end_time: string;
  classroom?: string | null;
  professor?: string | null;
  session_type?: RecurrentClass["session_type"];
}
const uid = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const mutation = (
  table: Mutation["table"],
  action: Mutation["action"],
  record: object,
): Mutation => ({
  id: uid(),
  table,
  action,
  record: flatRecord(record as Record<string, unknown>),
});

function useStore() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [activeId, setActiveId] = useState(DEFAULT_PROFILES[0].id);
  const [hasSelectedProfile, setHasSelectedProfile] = useState(false);
  const [viewMode, setViewMode] = useState<DuoViewMode>("mine");
  const [isLoaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "loading" | "saved" | "syncing" | "offline" | "error"
  >("loading");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [engine, setEngine] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedBatchId, setRejectedBatchId] = useState<string | null>(null);
  const ref = useRef(snapshot);
  const queue = useRef<Batch[]>([]);
  const syncing = useRef(false);
  const ready = useRef(false);
  const activeProfile =
    snapshot.profiles.find((p) => p.id === activeId) ||
    snapshot.profiles[0] ||
    DEFAULT_PROFILES[0];
  const partnerProfile = snapshot.profiles.find(
    (p) => p.id !== activeProfile.id,
  );

  function persist(next: Snapshot) {
    localStorage.setItem(
      "memoria_v4",
      JSON.stringify({ snapshot: next, queue: queue.current }),
    );
    ref.current = next;
    setSnapshot(next);
    setPendingCount(queue.current.length);
  }
  async function sync() {
    if (!ready.current || syncing.current) return;
    syncing.current = true;
    try {
      if (!navigator.onLine)
        throw new Error(
          "Sin conexión. Tus cambios están guardados en este dispositivo.",
        );
      if (queue.current.length) setSyncStatus("syncing");
      do {
        const batch = queue.current[0];
        const response = await fetch(
          "/api/data",
          batch
            ? {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(batch),
                signal: AbortSignal.timeout(15000),
              }
            : { cache: "no-store", signal: AbortSignal.timeout(15000) },
        );
        const data = await response.json();
        if (!response.ok) {
          if (batch && response.status >= 400 && response.status < 500)
            setRejectedBatchId(batch.id);
          throw new Error(
            data.error || "No se pudo guardar en la base de datos.",
          );
        }
        setEngine(data.engine);
        if (batch)
          queue.current = queue.current.filter((b) => b.id !== batch.id);
        persist(
          queue.current.reduce(
            (s, b) => applyMutations(s, b.mutations),
            normalizeSnapshot(data.snapshot),
          ),
        );
        if (batch) window.dispatchEvent(new Event("memoria:changed"));
      } while (queue.current.length);
      setSyncStatus("saved");
      setRejectedBatchId(null);
      setSyncError(null);
    } catch (error) {
      setSyncStatus(navigator.onLine ? "error" : "offline");
      setSyncError(
        error instanceof Error
          ? error.message
          : "No se pudo sincronizar. Reintenta.",
      );
    } finally {
      syncing.current = false;
    }
  }
  useEffect(() => {
    let local = emptySnapshot();
    try {
      const saved = localStorage.getItem("memoria_v4");
      if (saved) {
        if (!localStorage.getItem("memoria_v4_recovery"))
          localStorage.setItem("memoria_v4_recovery", saved);
        const parsed = JSON.parse(saved);
        local = normalizeSnapshot(parsed.snapshot);
        queue.current = parsed.queue || [];
      } else {
        const parse = (key: string) =>
          JSON.parse(localStorage.getItem(key) || "null") || [];
        local = normalizeSnapshot({
          profiles: parse("memoria_profiles"),
          subjects: parse("memoria_v3_subjects"),
          recurrentClasses: parse("memoria_v3_classes"),
          activities: parse("memoria_v3_activities"),
        });
        // Preserve old keys as a backup; infer missing ownership from the parent course.
        if (local.subjects.length || local.activities.length)
          queue.current.push({
            id: uid(),
            actor: DEFAULT_PROFILES[0].id,
            mutations: [
              ...local.subjects.map((s) => mutation("subjects", "upsert", s)),
              ...local.recurrentClasses.map((c) =>
                mutation("recurrentClasses", "upsert", c),
              ),
              ...local.activities.map((a) =>
                mutation("activities", "upsert", a),
              ),
            ],
          });
      }
      persist(local);
    } catch {
      setSyncError(
        "No se pudo recuperar el respaldo. Conserva los datos del navegador y reintenta.",
      );
    }
    ready.current = true;
    setLoaded(true);
    void sync();
    const refresh = () => {
      if (document.visibilityState === "visible") void sync();
    };
    const interval = window.setInterval(refresh, 15000);
    const pushRefresh = (event: MessageEvent) => {
      if (event.data?.type === "MEMORIA_REFRESH") void sync();
    };
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("memoria-sync")
        : null;
    if (channel) channel.onmessage = () => void sync();
    const localChanged = () => channel?.postMessage("changed");
    window.addEventListener("memoria:changed", localChanged);
    navigator.serviceWorker?.addEventListener("message", pushRefresh);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      channel?.close();
      window.removeEventListener("memoria:changed", localChanged);
      navigator.serviceWorker?.removeEventListener("message", pushRefresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  function commit(mutations: Mutation[], purpose?: Batch["purpose"]) {
    if (!mutations.length) return;
    const batch = validateBatch(
      {
        id: uid(),
        actor: activeProfile.id,
        mutations,
        ...(purpose ? { purpose } : {}),
      },
      ref.current,
    );
    const next = applyMutations(ref.current, batch.mutations);
    const nextQueue = [...queue.current, batch];
    localStorage.setItem(
      "memoria_v4",
      JSON.stringify({ snapshot: next, queue: nextQueue }),
    );
    queue.current = nextQueue;
    persist(next);
    setSyncStatus("syncing");
    void sync();
  }
  function classesFor(
    subjectId: string,
    profileId: string,
    slots: ScheduleInput[],
  ): RecurrentClass[] {
    return slots.map((slot) => {
      const valid = validateClassScheduleSlot(slot);
      if (!valid.valid) throw new Error(valid.error);
      return {
        ...slot,
        id:
          slot.id &&
          ref.current.recurrentClasses.some(
            (c) => c.id === slot.id && c.subject_id === subjectId,
          )
            ? slot.id
            : uid(),
        subject_id: subjectId,
        profile_id: profileId,
        classroom: slot.classroom?.trim() || null,
        professor: slot.professor?.trim() || null,
        session_type: slot.session_type || "theory",
        created_at: new Date().toISOString(),
      };
    });
  }
  function addSubject(
    input: CreateSubjectInput,
    slots: ScheduleInput[] = [],
    profileId?: string,
  ) {
    const subject = {
      ...input,
      id: uid(),
      profile_id: profileId || input.profile_id || activeProfile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    commit([
      mutation("subjects", "upsert", subject),
      ...classesFor(subject.id, subject.profile_id, slots).map((c) =>
        mutation("recurrentClasses", "upsert", c),
      ),
    ]);
    return subject;
  }
  function updateSubject(
    id: string,
    input: Partial<CreateSubjectInput>,
    slots?: ScheduleInput[],
  ) {
    const old = ref.current.subjects.find((s) => s.id === id);
    if (!old) return;
    const subject = {
      ...old,
      ...input,
      id,
      profile_id: input.profile_id || old.profile_id!,
      updated_at: new Date().toISOString(),
    };
    const mutations = [mutation("subjects", "upsert", subject)];
    if (slots)
      mutations.push(
        ...ref.current.recurrentClasses
          .filter(
            (c) =>
              c.subject_id === id && !slots.some((slot) => slot.id === c.id),
          )
          .map((c) => mutation("recurrentClasses", "delete", { id: c.id })),
        ...classesFor(id, subject.profile_id, slots).map((c) =>
          mutation("recurrentClasses", "upsert", c),
        ),
      );
    for (const a of ref.current.activities.filter(
      (a) => a.subject_id === id && a.profile_id !== subject.profile_id,
    ))
      mutations.push(
        mutation("activities", "upsert", {
          ...a,
          profile_id: subject.profile_id,
        }),
      );
    commit(mutations);
  }
  function addActivity(input: CreateActivityInput): Activity {
    const subject = ref.current.subjects.find((s) => s.id === input.subject_id);
    const owner = input.profile_id || subject?.profile_id || activeProfile.id;
    if (subject && subject.profile_id !== owner)
      throw new Error("El curso pertenece a otro perfil.");
    const activity: Activity = {
      ...input,
      id: uid(),
      profile_id: owner,
      is_shared: !!input.is_shared,
      invitation: input.invitation || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    commit([mutation("activities", "upsert", activity)]);
    return activity;
  }
  function updateActivity(
    id: string,
    input: Partial<CreateActivityInput>,
    expectedUpdatedAt?: string,
  ) {
    const old = ref.current.activities.find((a) => a.id === id);
    if (!old) return;
    if (expectedUpdatedAt && old.updated_at !== expectedUpdatedAt)
      throw new Error("La actividad cambió. Revisa la propuesta de nuevo.");
    const next = { ...old, ...input, updated_at: new Date().toISOString() };
    if (
      next.subject_id &&
      !ref.current.subjects.some(
        (s) => s.id === next.subject_id && s.profile_id === next.profile_id,
      )
    )
      throw new Error("El curso pertenece a otro perfil.");
    if (old.invitation && invitationSender(old) !== activeProfile.id)
      throw new Error("Solo quien invita puede editar la cita.");
    if (
      old.invitation &&
      ["start_datetime", "end_datetime", "title", "description"].some(
        (k) =>
          k in input &&
          input[k as keyof CreateActivityInput] !== old[k as keyof Activity],
      )
    )
      next.invitation = {
        ...old.invitation,
        status: "pending",
        responded_at: null,
      };
    commit([
      {
        ...mutation("activities", "upsert", next),
        expected_updated_at: old.updated_at,
      },
    ]);
  }
  function respondInvitation(id: string, status: "accepted" | "declined") {
    const a = ref.current.activities.find((a) => a.id === id);
    if (a)
      commit([
        {
          ...mutation(
            "activities",
            "upsert",
            respondToInvitation(a, activeProfile.id, status),
          ),
          expected_updated_at: a.updated_at,
        },
      ]);
  }
  return {
    ...snapshot,
    isLoaded,
    syncStatus,
    syncError,
    engine,
    pendingCount,
    retrySync: sync,
    hasRejectedChange: !!rejectedBatchId,
    discardRejectedChange: () => {
      const rejected = queue.current.find((b) => b.id === rejectedBatchId);
      if (!rejected) return;
      const backups = JSON.parse(
        localStorage.getItem("memoria_rejected_changes") || "[]",
      );
      localStorage.setItem(
        "memoria_rejected_changes",
        JSON.stringify([...backups, rejected]),
      );
      queue.current = queue.current.filter((b) => b.id !== rejectedBatchId);
      setRejectedBatchId(null);
      persist(ref.current);
      void sync();
    },
    activeProfile,
    hasSelectedProfile,
    leaveProfile: () => {
      setHasSelectedProfile(false);
      setViewMode("mine");
    },
    partnerProfile,
    viewMode,
    setActiveProfile: (profile: UserProfile) => {
      setActiveId(profile.id);
      setViewMode("mine");
      setHasSelectedProfile(true);
    },
    setViewMode,
    updateProfile: (id: string, input: Partial<UserProfile>) => {
      const p = ref.current.profiles.find((p) => p.id === id);
      if (p) commit([mutation("profiles", "upsert", { ...p, ...input, id })]);
    },
    addSubject,
    updateSubject,
    updateClassExceptions: (
      id: string,
      exceptions: RecurrentClass["exceptions"],
    ) => {
      const c = ref.current.recurrentClasses.find(
        (c) => c.id === id && c.profile_id === activeProfile.id,
      );
      if (!c) throw new Error("La sesión no pertenece a tu perfil.");
      commit([mutation("recurrentClasses", "upsert", { ...c, exceptions })]);
    },
    counterInvitation: (
      id: string,
      start: string,
      end: string,
      version: string,
    ) => {
      const current = ref.current.activities.find((a) => a.id === id);
      if (!current || Date.parse(current.updated_at) !== Date.parse(version))
        throw new Error("La invitación cambió. Revisa la propuesta otra vez.");
      commit([
        {
          ...mutation(
            "activities",
            "upsert",
            counterProposal(current, activeProfile.id, start, end),
          ),
          intent: "counterproposal",
          expected_updated_at: version,
        },
      ]);
    },
    restoreBackup: (preview: RestorePreview) => {
      if (queue.current.length || syncing.current)
        throw new Error(
          "Espera a que terminen de guardarse tus cambios antes de restaurar.",
        );
      if (snapshotKey(ref.current) !== preview.baseKey)
        throw new Error(
          "Los datos cambiaron. Vuelve a revisar el archivo para actualizar la vista previa.",
        );
      const latest = buildRestorePreview(
        preview.backup,
        ref.current,
        activeProfile.id,
      );
      if (!latest.mutations.length)
        throw new Error("No hay registros nuevos que recuperar.");
      localStorage.setItem(
        "memoria_before_restore",
        JSON.stringify({
          version: 4,
          exported_at: new Date().toISOString(),
          snapshot: ref.current,
        }),
      );
      commit(latest.mutations, "restore");
    },
    deleteSubject: (id: string) =>
      commit([mutation("subjects", "delete", { id })]),
    addRecurrentClass: (
      input: Omit<RecurrentClass, "id" | "created_at" | "user_id">,
    ) => {
      const s = ref.current.subjects.find((s) => s.id === input.subject_id);
      if (s)
        commit(
          classesFor(s.id, s.profile_id!, [input]).map((c) =>
            mutation("recurrentClasses", "upsert", c),
          ),
        );
    },
    deleteRecurrentClass: (id: string) =>
      commit([mutation("recurrentClasses", "delete", { id })]),
    addActivity,
    updateActivity,
    deleteActivity: (id: string) => {
      const a = ref.current.activities.find((a) => a.id === id);
      if (a?.invitation && a.profile_id !== activeProfile.id)
        throw new Error("Solo quien invita puede eliminar la cita.");
      commit([mutation("activities", "delete", { id })]);
    },
    toggleActivityStatus: (id: string) => {
      const a = ref.current.activities.find((a) => a.id === id);
      if (a)
        updateActivity(id, {
          status: a.status === "completed" ? "pending" : "completed",
        });
    },
    respondInvitation,
    importPreviousSchedule: () => {
      const data = normalizeSnapshot({
        ...emptySnapshot(),
        subjects: INITIAL_SUBJECTS.filter(
          (s) => s.profile_id === activeProfile.id,
        ),
        recurrentClasses: INITIAL_RECURRENT_CLASSES.filter(
          (c) => c.profile_id === activeProfile.id,
        ),
      });
      commit([
        ...data.subjects
          .filter((s) => !ref.current.subjects.some((r) => r.id === s.id))
          .map((s) => mutation("subjects", "upsert", s)),
        ...data.recurrentClasses
          .filter(
            (c) => !ref.current.recurrentClasses.some((r) => r.id === c.id),
          )
          .map((c) => mutation("recurrentClasses", "upsert", c)),
      ]);
    },
    visibleActivities: snapshot.activities.filter((a) =>
      isVisibleActivity(a, activeProfile.id),
    ),
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function MemoriaProvider({ children }: { children: React.ReactNode }) {
  const store = useStore();
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useMemoria() {
  const value = useContext(Context);
  if (!value) throw new Error("MemoriaProvider requerido.");
  return value;
}

import type { Snapshot } from "@/lib/storage/model";
import type { Activity } from "@/types/database.types";
import {
  isPendingInvitation,
  isVisibleActivity,
  invitationSender,
  invitationParticipants,
} from "@/lib/storage/model";

export interface NotificationJob {
  id: string;
  profile_id: string;
  activity_id: string;
  kind: "invitation" | "response" | "cancelled" | "reminder";
  version: string;
  title: string;
  body: string;
  url: string;
}
export interface PushDevice {
  id: string;
  profile_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  token_hash: string;
  reminder_minutes: number;
  updated_at: string;
}
export interface Delivery {
  id: string;
  job: NotificationJob;
  device_id: string;
  attempts: number;
}
const when = (a: Activity) =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(a.start_datetime));
export function notificationChanges(
  before: Snapshot,
  after: Snapshot,
): NotificationJob[] {
  const jobs: NotificationJob[] = [];
  for (const a of after.activities) {
    const old = before.activities.find((b) => b.id === a.id);
    const sender =
      after.profiles.find((p) => p.id === invitationSender(a))?.name ||
      "Tu pareja";
    if (
      isPendingInvitation(a) &&
      (!old ||
        !isPendingInvitation(old) ||
        ["title", "description", "start_datetime", "end_datetime"].some(
          (k) => a[k as keyof Activity] !== old[k as keyof Activity],
        ))
    ) {
      jobs.push({
        id: `invitation:${a.id}:${a.updated_at}`,
        profile_id: a.invitation!.recipient_id,
        activity_id: a.id,
        kind: "invitation",
        version: a.updated_at,
        title: `${sender} te invita`,
        body: `${a.title} · ${when(a)}`,
        url: "/together",
      });
    }
    if (
      old?.invitation?.status === "pending" &&
      a.invitation &&
      a.invitation.status !== "pending" &&
      a.invitation.responded_at !== old.invitation.responded_at
    ) {
      const recipient =
        after.profiles.find((p) => p.id === a.invitation!.recipient_id)?.name ||
        "Tu pareja";
      jobs.push({
        id: `response:${a.id}:${a.invitation.responded_at}`,
        profile_id: invitationSender(a),
        activity_id: a.id,
        kind: "response",
        version: a.invitation.responded_at!,
        title: `${recipient} ${a.invitation.status === "accepted" ? "aceptó" : "rechazó"} tu invitación`,
        body: `${a.title} · ${when(a)}`,
        url: "/together",
      });
    }
    if (
      old?.invitation &&
      old.status !== "cancelled" &&
      a.status === "cancelled"
    )
      jobs.push(cancelJob(old, a.updated_at));
  }
  for (const old of before.activities)
    if (
      old.invitation &&
      old.status !== "cancelled" &&
      !after.activities.some((a) => a.id === old.id)
    )
      jobs.push(cancelJob(old, `deleted:${old.updated_at}`));
  return jobs;
}
function cancelJob(a: Activity, version: string): NotificationJob {
  return {
    id: `cancelled:${a.id}:${version}`,
    profile_id: invitationParticipants(a).find((id) => id !== a.profile_id)!,
    activity_id: a.id,
    kind: "cancelled",
    version,
    title: "Se canceló una propuesta",
    body: a.title,
    url: "/together",
  };
}
export function reminderJobs(
  snapshot: Snapshot,
  devices: PushDevice[],
  now: number,
): Array<{ job: NotificationJob; device: PushDevice }> {
  return devices.flatMap((device) =>
    snapshot.activities
      .filter(
        (a) =>
          a.status !== "completed" &&
          a.status !== "cancelled" &&
          (!a.invitation || a.invitation.status === "accepted") &&
          isVisibleActivity(a, device.profile_id) &&
          Date.parse(a.start_datetime) > now &&
          Date.parse(a.start_datetime) - now <=
            device.reminder_minutes * 60_000,
      )
      .map((a) => ({
        device,
        job: {
          id: `reminder:${a.id}:${a.start_datetime}`,
          profile_id: device.profile_id,
          activity_id: a.id,
          kind: "reminder" as const,
          version: a.start_datetime,
          title: "Próxima actividad",
          body: `${a.title} · ${when(a)}`,
          url: "/today",
        },
      })),
  );
}
export function jobIsCurrent(
  job: NotificationJob,
  snapshot: Snapshot,
): boolean {
  const a = snapshot.activities.find((a) => a.id === job.activity_id);
  if (job.kind === "cancelled") return !a || a.status === "cancelled";
  if (!a || a.status === "cancelled" || a.status === "completed") return false;
  if (job.kind === "invitation")
    return isPendingInvitation(a) && a.updated_at === job.version;
  if (job.kind === "response")
    return (
      a.invitation?.responded_at === job.version &&
      a.invitation.status !== "pending"
    );
  return (
    a.start_datetime === job.version &&
    isVisibleActivity(a, job.profile_id) &&
    (!a.invitation || a.invitation.status === "accepted") &&
    Date.parse(a.start_datetime) > Date.now()
  );
}

import webpush from "web-push";
import { readDatabase } from "@/lib/storage/database";
import { devices, enqueue, claimDeliveries, finishDelivery, removeDevice } from "./store";
import { reminderJobs, jobIsCurrent, PushDevice } from "./model";
export function pushConfig() {
  return { configured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT), publicKey: process.env.VAPID_PUBLIC_KEY || "" };
}
export const safePushEndpoint = (endpoint: string) => {
  try { const url = new URL(endpoint); return url.protocol === "https:" && (!url.port || url.port === "443") && !url.username && !url.password && !url.hash && ["fcm.googleapis.com", "push.services.mozilla.com", "notify.windows.com", "web.push.apple.com"].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)); } catch { return false; }
};
export async function sendToDevice(device: PushDevice, message: { title: string; body: string; url: string; tag: string }) {
  if (!safePushEndpoint(device.endpoint)) throw new Error("Servicio de avisos no reconocido.");
  return webpush.sendNotification({ endpoint: device.endpoint, keys: device.keys }, JSON.stringify(message), {
    vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! }, TTL: 3600, timeout: 8000,
  });
}
let running = false;
export async function dispatchNotifications() {
  if (running || !pushConfig().configured) return { sent: 0, skipped: true };
  running = true;
  let sent = 0;
  try {
    const [snapshot, registered] = await Promise.all([readDatabase(), devices()]);
    for (const { job, device } of reminderJobs(snapshot, registered, Date.now())) await enqueue(job, device);
    const deliveries = await claimDeliveries();
    // Bound concurrency and duration for serverless invocations.
    for (let i = 0; i < deliveries.length; i += 5) await Promise.all(deliveries.slice(i, i + 5).map(async (delivery) => {
      const device = registered.find((d) => d.id === delivery.device_id);
      if (!device || device.profile_id !== delivery.job.profile_id || !jobIsCurrent(delivery.job, snapshot)) { await finishDelivery(delivery, "discarded"); return; }
      const latest = snapshot.activities.find((a) => a.id === delivery.job.activity_id);
      try {
        await sendToDevice(device, { title: delivery.job.title, body: delivery.job.kind === "reminder" && latest ? `${latest.title} · ${new Intl.DateTimeFormat("es-PE", { timeStyle: "short", timeZone: "America/Lima" }).format(new Date(latest.start_datetime))}` : delivery.job.body, url: delivery.job.url, tag: delivery.job.id });
        await finishDelivery(delivery, "sent"); sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await removeDevice(device.id);
        else await finishDelivery(delivery, status === 400 || status === 401 || status === 403 ? "discarded" : "pending");
      }
    }));
    return { sent, skipped: false };
  } finally { running = false; }
}

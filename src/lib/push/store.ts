import { createHash, timingSafeEqual } from "node:crypto";
import { localDatabase, cloudClient, storageEngine } from "@/lib/storage/database";
import type { Delivery, NotificationJob, PushDevice } from "./model";
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function ownsDevice(device: PushDevice, token: string) { const hash = tokenHash(token); return device.token_hash.length === hash.length && timingSafeEqual(Buffer.from(hash), Buffer.from(device.token_hash)); }
export async function devices(): Promise<PushDevice[]> {
  if (storageEngine() === "sqlite") return localDatabase().prepare("SELECT data FROM push_devices").all().map((row) => JSON.parse(String(row.data)));
  const { data, error } = await cloudClient().from("memoria_push_devices").select("*");
  if (error) throw new Error("Falta configurar el almacenamiento de avisos en Supabase.");
  return data || [];
}
export async function registerDevice(device: PushDevice) {
  if (storageEngine() !== "sqlite") {
    const { error } = await cloudClient().rpc("memoria_register_push", { device });
    if (error) throw new Error("No se pudo vincular este dispositivo. Revisa su configuración de avisos.");
    return;
  }
  const db = localDatabase(); db.exec("BEGIN IMMEDIATE");
  try {
    const previous = db.prepare("SELECT data FROM push_devices WHERE id=?").get(device.id);
    if (previous && JSON.parse(String(previous.data)).token_hash !== device.token_hash) throw new Error("La vinculación del dispositivo no coincide.");
    db.prepare("INSERT INTO push_devices(id,profile_id,endpoint,data) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET profile_id=excluded.profile_id,endpoint=excluded.endpoint,data=excluded.data").run(device.id, device.profile_id, device.endpoint, JSON.stringify(device));
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
export async function removeDevice(id: string) {
  if (storageEngine() === "sqlite") { localDatabase().prepare("DELETE FROM push_devices WHERE id=?").run(id); return; }
  const { error } = await cloudClient().from("memoria_push_devices").delete().eq("id", id);
  if (error) throw new Error("No se pudo desactivar el dispositivo.");
}
export async function enqueue(job: NotificationJob, device: PushDevice) {
  const id = `${job.id}:${device.id}`;
  if (storageEngine() === "sqlite") { localDatabase().prepare("INSERT OR IGNORE INTO push_deliveries(id,device_id,job) VALUES(?,?,?)").run(id, device.id, JSON.stringify(job)); return; }
  const { error } = await cloudClient().from("memoria_push_deliveries").upsert({ id, device_id: device.id, job }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error("No se pudo programar el aviso.");
}
export async function claimDeliveries(): Promise<Delivery[]> {
  if (storageEngine() !== "sqlite") {
    const { data, error } = await cloudClient().rpc("memoria_claim_push");
    if (error) throw new Error("No se pudieron recuperar los avisos pendientes.");
    return data || [];
  }
  const db = localDatabase(), now = Date.now(); db.exec("BEGIN IMMEDIATE");
  try {
    const rows = db.prepare("SELECT * FROM push_deliveries WHERE state='pending' AND attempts<5 AND available_at<=? AND lease_until<=? LIMIT 20").all(now, now);
    const claim = db.prepare("UPDATE push_deliveries SET lease_until=?,attempts=attempts+1 WHERE id=?");
    for (const row of rows) claim.run(now + 120_000, String(row.id));
    db.exec("COMMIT");
    return rows.map((row) => ({ id: String(row.id), device_id: String(row.device_id), attempts: Number(row.attempts) + 1, job: JSON.parse(String(row.job)) }));
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
export async function finishDelivery(delivery: Delivery, state: "sent" | "discarded" | "pending") {
  const available = Date.now() + Math.min(900, 30 * 2 ** delivery.attempts) * 1000;
  if (storageEngine() === "sqlite") { localDatabase().prepare("UPDATE push_deliveries SET state=?,available_at=?,lease_until=0 WHERE id=?").run(state, available, delivery.id); return; }
  const { error } = await cloudClient().from("memoria_push_deliveries").update({ state, available_at: new Date(available).toISOString(), lease_until: null }).eq("id", delivery.id);
  if (error) throw new Error("No se pudo registrar la entrega del aviso.");
}

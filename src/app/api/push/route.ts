import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pushConfig, safePushEndpoint, sendToDevice } from "@/lib/push/server";
import { devices, ownsDevice, registerDevice, removeDevice, tokenHash } from "@/lib/push/store";
import { readDatabase } from "@/lib/storage/database";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const identity = z.object({ id: z.string().uuid(), token: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/) });
const schema = identity.extend({ profile_id: z.string().uuid(), reminder_minutes: z.number().int().min(1).max(120), subscription: z.object({ endpoint: z.string().url().refine(safePushEndpoint, "Servicio push no reconocido."), keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/), auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/) }) }) });
const sameOrigin = (req: NextRequest) => req.headers.get("origin") === req.nextUrl.origin;
export async function GET(req: NextRequest) {
  try {
    const config = pushConfig(), id = req.headers.get("x-device-id"), token = req.headers.get("x-device-token");
    const parsed = identity.safeParse({ id, token });
    const device = parsed.success ? (await devices()).find((d) => d.id === id && ownsDevice(d, token!)) : null;
    return NextResponse.json({ ...config, device: device ? { profile_id: device.profile_id, reminder_minutes: device.reminder_minutes } : null }, { headers });
  } catch { return NextResponse.json({ error: "No se pudo consultar la configuración de avisos. Comprueba la conexión y las migraciones." }, { status: 503, headers }); }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  try {
    if (!pushConfig().configured) return NextResponse.json({ error: "Los avisos todavía no están configurados en el servidor." }, { status: 503 });
    const raw = await req.json();
    if (raw.action === "test") {
      const credentials = identity.parse(raw);
      const device = (await devices()).find((d) => d.id === credentials.id && ownsDevice(d, credentials.token));
      if (!device) return NextResponse.json({ error: "Activa los avisos primero." }, { status: 403 });
      await sendToDevice(device, { title: "Avisos de memorIA", body: "Este dispositivo está listo para recibir invitaciones y recordatorios.", url: "/settings", tag: `test:${device.id}` });
    } else {
      const input = schema.parse(raw);
      if (!(await readDatabase()).profiles.some((p) => p.id === input.profile_id)) throw new Error("Perfil desconocido.");
      await registerDevice({ id: input.id, profile_id: input.profile_id, endpoint: input.subscription.endpoint, keys: input.subscription.keys, token_hash: tokenHash(input.token), reminder_minutes: input.reminder_minutes, updated_at: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true }, { headers });
  } catch (e) { return NextResponse.json({ error: e instanceof z.ZodError ? "Datos de suscripción inválidos." : e instanceof Error ? e.message : "No se pudo activar el aviso." }, { status: e instanceof z.ZodError ? 422 : 503, headers }); }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  try {
    const input = identity.parse(await req.json());
    const device = (await devices()).find((d) => d.id === input.id);
    if (device && !ownsDevice(device, input.token)) return NextResponse.json({ error: "Dispositivo no autorizado." }, { status: 403 });
    if (device) await removeDevice(device.id);
    return NextResponse.json({ ok: true }, { headers });
  } catch { return NextResponse.json({ error: "No se pudo desactivar. Reintenta al recuperar la conexión." }, { status: 503, headers }); }
}

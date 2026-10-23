import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dispatchNotifications } from "@/lib/push/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const received = req.headers.get("authorization") || "";
  if (!expected || expected.length < 32 || Buffer.byteLength(received) !== Buffer.byteLength(`Bearer ${expected}`) || !timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${expected}`))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try { return NextResponse.json(await dispatchNotifications(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "No se pudo procesar la cola de avisos." }, { status: 503 }); }
}

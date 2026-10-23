import { NextRequest, NextResponse, after } from "next/server";
import { dispatchNotifications } from "@/lib/push/server";
import {
  readDatabase,
  writeDatabase,
  storageEngine,
} from "@/lib/storage/database";
import { MutationValidationError } from "@/lib/storage/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  try {
    return NextResponse.json(
      { snapshot: await readDatabase(), engine: storageEngine() },
      { headers },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "No se pudo leer la base de datos.",
      },
      { status: 503, headers },
    );
  }
}
export async function POST(req: NextRequest) {
  if (
    req.headers.get("origin") &&
    req.headers.get("origin") !== req.nextUrl.origin
  )
    return NextResponse.json(
      { error: "Origen no permitido." },
      { status: 403 },
    );
  try {
    if (Number(req.headers.get("content-length") || 0) > 2_000_000)
      return NextResponse.json(
        { error: "Solicitud demasiado grande." },
        { status: 413 },
      );
    const snapshot = await writeDatabase(await req.json());
    after(async () => { try { await dispatchNotifications(); } catch { console.error("Push dispatch deferred; durable jobs will be retried."); } });
    return NextResponse.json(
      {
        snapshot,
        engine: storageEngine(),
      },
      { headers },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo guardar." },
      { status: e instanceof MutationValidationError ? 422 : 503, headers },
    );
  }
}

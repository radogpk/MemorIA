import { NextRequest, NextResponse } from "next/server";
import { QuickAddRequestSchema, QuickAddOutputSchema } from "@/lib/ai/schemas";
import { parseQuickAdd } from "@/lib/ai/date-parser";
export async function POST(req: NextRequest) {
  try {
    const parsed = QuickAddRequestSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Revisa el texto, la fecha de referencia y la zona horaria." },
        { status: 400 },
      );
    const { raw_text, subjects_context, current_datetime, user_timezone } =
      parsed.data;
    return NextResponse.json({
      parsed: QuickAddOutputSchema.parse(
        parseQuickAdd(
          raw_text,
          subjects_context,
          current_datetime,
          user_timezone,
        ),
      ),
      source: "spanish_calendar_parser",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo interpretar la actividad.",
      },
      { status: 422 },
    );
  }
}

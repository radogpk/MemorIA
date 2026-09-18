import { NextRequest, NextResponse } from 'next/server';
import { QuickAddRequestSchema, QuickAddOutputSchema } from '@/lib/ai/schemas';
import { getGeminiModel } from '@/lib/ai/gemini';
import { getQuickAddSystemPrompt } from '@/lib/ai/prompts';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parseResult = QuickAddRequestSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { raw_text, user_timezone, current_datetime, subjects_context } = parseResult.data;

    const model = getGeminiModel();

    if (!model) {
      // API Key not yet provided in environment - return intelligent server-side fallback
      const fallback = serverHeuristicParse(raw_text, subjects_context, current_datetime);
      return NextResponse.json({ parsed: fallback, source: 'heuristic_fallback' });
    }

    const systemPrompt = getQuickAddSystemPrompt(
      current_datetime,
      user_timezone,
      subjects_context
    );

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Entrada del usuario: "${raw_text}"` },
    ]);

    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const rawParsed = JSON.parse(cleanedText);
    const validated = QuickAddOutputSchema.parse(rawParsed);

    return NextResponse.json({ parsed: validated, source: 'gemini_flash' });
  } catch (error: any) {
    console.error('Error in /api/ai/quick-add:', error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud con IA', message: error?.message },
      { status: 500 }
    );
  }
}

function serverHeuristicParse(text: string, subjects: any[], refDatetime: string) {
  const lower = text.toLowerCase();
  let type: 'task' | 'exam' | 'meeting' | 'personal' = 'task';
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

  if (lower.includes('examen') || lower.includes('parcial') || lower.includes('evaluación')) {
    type = 'exam';
    priority = 'high';
  } else if (lower.includes('reunión') || lower.includes('meet') || lower.includes('zoom')) {
    type = 'meeting';
  }

  const matched = subjects.find(
    (s) =>
      lower.includes(s.name.toLowerCase()) ||
      (s.code && lower.includes(s.code.toLowerCase()))
  );

  const baseDate = new Date(refDatetime);
  const targetDate = new Date(baseDate);

  if (lower.includes('mañana')) {
    targetDate.setDate(baseDate.getDate() + 1);
  } else if (lower.includes('martes')) {
    targetDate.setDate(baseDate.getDate() + ((2 + 7 - baseDate.getDay()) % 7 || 7));
  } else if (lower.includes('miércoles') || lower.includes('miercoles')) {
    targetDate.setDate(baseDate.getDate() + ((3 + 7 - baseDate.getDay()) % 7 || 7));
  } else if (lower.includes('jueves')) {
    targetDate.setDate(baseDate.getDate() + ((4 + 7 - baseDate.getDay()) % 7 || 7));
  } else if (lower.includes('viernes')) {
    targetDate.setDate(baseDate.getDate() + ((5 + 7 - baseDate.getDay()) % 7 || 7));
  } else {
    targetDate.setDate(baseDate.getDate() + 2);
  }

  targetDate.setHours(type === 'exam' ? 10 : 23, type === 'exam' ? 0 : 59, 0, 0);

  return {
    title: text.length > 50 ? text.slice(0, 50) + '...' : text,
    type,
    subject_id: matched ? matched.id : null,
    subject_name: matched ? matched.name : undefined,
    start_datetime: targetDate.toISOString(),
    end_datetime:
      type === 'exam'
        ? new Date(targetDate.getTime() + 2 * 60 * 60 * 1000).toISOString()
        : null,
    priority,
    description: `Detectado por memorIA: "${text}"`,
  };
}

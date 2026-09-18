import { describe, it, expect } from 'vitest';
import { QuickAddOutputSchema } from '@/lib/ai/schemas';

describe('AI Quick-Add Zod Schema Validation', () => {
  it('should validate a correct structured output from Gemini', () => {
    const rawAiResponse = {
      title: 'Examen Parcial de Cálculo',
      type: 'exam',
      subject_id: 'sub-calc',
      subject_name: 'Cálculo Diferencial',
      start_datetime: '2026-09-22T10:00:00.000Z',
      end_datetime: '2026-09-22T12:00:00.000Z',
      priority: 'high',
      description: 'Capítulos 1 y 2',
    };

    const parsed = QuickAddOutputSchema.safeParse(rawAiResponse);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('exam');
      expect(parsed.data.priority).toBe('high');
      expect(parsed.data.title).toBe('Examen Parcial de Cálculo');
    }
  });

  it('should reject output with invalid activity type', () => {
    const invalidResponse = {
      title: 'Evento Raro',
      type: 'invalid_type',
      start_datetime: '2026-09-22T10:00:00.000Z',
      priority: 'medium',
    };

    const parsed = QuickAddOutputSchema.safeParse(invalidResponse);
    expect(parsed.success).toBe(false);
  });
});

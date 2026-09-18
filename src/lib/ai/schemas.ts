import { z } from 'zod';

export const QuickAddOutputSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  type: z.enum(['task', 'exam', 'meeting', 'personal']),
  subject_id: z.string().nullable().optional(),
  subject_name: z.string().optional(),
  start_datetime: z.string().min(1, 'La fecha y hora de inicio es requerida'),
  end_datetime: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  description: z.string().nullable().optional(),
});

export type QuickAddOutput = z.infer<typeof QuickAddOutputSchema>;

export const QuickAddRequestSchema = z.object({
  raw_text: z.string().min(1, 'El texto no puede estar vacío'),
  user_timezone: z.string().default('UTC'),
  current_datetime: z.string(),
  subjects_context: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string().nullable().optional(),
    })
  ).default([]),
});

export type QuickAddRequest = z.infer<typeof QuickAddRequestSchema>;

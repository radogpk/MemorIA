import { z } from "zod";

export const QuickAddOutputSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  type: z.enum(["task", "exam", "meeting", "personal"]),
  subject_id: z.string().nullable().optional(),
  subject_name: z.string().nullable().optional(),
  start_datetime: z.string().datetime({ offset: true }),
  end_datetime: z.string().datetime({ offset: true }).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  description: z.string().nullable().optional(),
});

export type QuickAddOutput = z.infer<typeof QuickAddOutputSchema>;

export const QuickAddRequestSchema = z.object({
  raw_text: z.string().trim().min(1, "El texto no puede estar vacío").max(2000),
  user_timezone: z
    .string()
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("es", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Zona horaria inválida")
    .default("America/Lima"),
  current_datetime: z.string().datetime({ offset: true }),
  subjects_context: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        code: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

export type QuickAddRequest = z.infer<typeof QuickAddRequestSchema>;

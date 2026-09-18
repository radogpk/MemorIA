export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSubjectInput(data: {
  name?: string;
  color?: string;
  code?: string | null;
}): ValidationResult {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: 'El nombre de la materia es obligatorio.' };
  }

  if (data.color && !/^#[0-9a-fA-F]{6}$/.test(data.color)) {
    return { valid: false, error: 'El color debe ser un valor hexadecimal válido (ej. #3b82f6).' };
  }

  return { valid: true };
}

export function validateClassScheduleSlot(slot: {
  day_of_week: number;
  start_time: string;
  end_time: string;
}): ValidationResult {
  if (slot.day_of_week < 1 || slot.day_of_week > 7) {
    return { valid: false, error: 'El día de la semana debe ser entre 1 (Lunes) y 7 (Domingo).' };
  }

  if (!slot.start_time || !slot.end_time) {
    return { valid: false, error: 'Las horas de inicio y fin son obligatorias.' };
  }

  const [startH, startM] = slot.start_time.split(':').map(Number);
  const [endH, endM] = slot.end_time.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) {
    return { valid: false, error: 'La hora de fin debe ser posterior a la hora de inicio.' };
  }

  return { valid: true };
}

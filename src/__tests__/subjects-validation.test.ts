import { describe, it, expect } from 'vitest';
import { validateSubjectInput, validateClassScheduleSlot } from '@/lib/actions/subjects-validation';

describe('Subjects & Schedule Validation', () => {
  it('should reject subject with empty name', () => {
    const result = validateSubjectInput({
      name: '  ',
      color: '#3b82f6',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('nombre');
  });

  it('should reject invalid hex color', () => {
    const result = validateSubjectInput({
      name: 'Física I',
      color: 'blue-invalid',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('color');
  });

  it('should accept valid subject input', () => {
    const result = validateSubjectInput({
      name: 'Redes de Computadoras',
      color: '#10b981',
      code: 'RED-201',
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject schedule slot where end_time is earlier than start_time', () => {
    const result = validateClassScheduleSlot({
      day_of_week: 2,
      start_time: '14:00',
      end_time: '12:00',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('hora');
  });

  it('should accept valid schedule slot', () => {
    const result = validateClassScheduleSlot({
      day_of_week: 3,
      start_time: '08:00',
      end_time: '10:00',
    });
    expect(result.valid).toBe(true);
  });
});

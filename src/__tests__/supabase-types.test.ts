import { describe, it, expect } from 'vitest';
import type { Subject, RecurrentClass, Activity } from '@/types/database.types';

describe('Supabase Database Types Contract', () => {
  it('should instantiate valid Subject object', () => {
    const subject: Subject = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Cálculo Diferencial',
      code: 'MAT-101',
      color: '#3b82f6',
      professor: 'Dr. Gauss',
      classroom: 'Aula 204',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(subject.name).toBe('Cálculo Diferencial');
    expect(subject.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should validate RecurrentClass structure', () => {
    const recurrent: RecurrentClass = {
      id: 'class-1',
      user_id: 'user-1',
      subject_id: 'sub-1',
      day_of_week: 1, // Lunes
      start_time: '08:00',
      end_time: '10:00',
      classroom: null,
      created_at: new Date().toISOString(),
    };

    expect(recurrent.day_of_week).toBeGreaterThanOrEqual(1);
    expect(recurrent.day_of_week).toBeLessThanOrEqual(7);
  });

  it('should validate Activity with different types and statuses', () => {
    const exam: Activity = {
      id: 'act-1',
      user_id: 'user-1',
      subject_id: 'sub-1',
      title: 'Examen Parcial 1',
      description: 'Capítulos 1 al 4',
      type: 'exam',
      status: 'pending',
      start_datetime: '2026-09-25T10:00:00.000Z',
      end_datetime: '2026-09-25T12:00:00.000Z',
      is_all_day: false,
      priority: 'high',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(exam.type).toBe('exam');
    expect(exam.priority).toBe('high');
  });
});

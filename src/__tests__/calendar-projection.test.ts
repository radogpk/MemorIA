import { describe, it, expect } from 'vitest';
import { projectRecurrentClassesForRange, detectCollisions } from '@/lib/calendar/projection';
import type { RecurrentClass, Subject, Activity } from '@/types/database.types';

describe('Calendar Projection & Collision Engine', () => {
  const mockSubject: Subject = {
    id: 'sub-1',
    user_id: 'user-1',
    name: 'Cálculo Diferencial',
    code: 'MAT-101',
    color: '#3b82f6',
    professor: 'Dr. Gauss',
    classroom: 'Aula 204',
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const mockRecurrentClass: RecurrentClass = {
    id: 'rec-1',
    user_id: 'user-1',
    subject_id: 'sub-1',
    day_of_week: 1, // Lunes
    start_time: '08:00',
    end_time: '10:00',
    classroom: 'Aula 204',
    created_at: '2026-09-01T00:00:00Z',
    subject: mockSubject,
  };

  it('should project a recurrent class into Monday of the given week', () => {
    // 2026-09-21 is a Monday
    const rangeStart = new Date('2026-09-21T00:00:00');
    const rangeEnd = new Date('2026-09-27T23:59:59');

    const projected = projectRecurrentClassesForRange([mockRecurrentClass], rangeStart, rangeEnd);

    expect(projected).toHaveLength(1);
    expect(projected[0].type).toBe('class');
    expect(projected[0].title).toBe('Cálculo Diferencial');
    expect(projected[0].start.getFullYear()).toBe(2026);
    expect(projected[0].start.getMonth()).toBe(8); // Septiembre (0-indexed)
    expect(projected[0].start.getDate()).toBe(21);
    expect(projected[0].start.getHours()).toBe(8);
    expect(projected[0].start.getMinutes()).toBe(0);
    expect(projected[0].end.getHours()).toBe(10);
  });

  it('should detect collision when an activity overlaps with a projected class', () => {
    const rangeStart = new Date('2026-09-21T00:00:00');
    const rangeEnd = new Date('2026-09-27T23:59:59');
    const projected = projectRecurrentClassesForRange([mockRecurrentClass], rangeStart, rangeEnd);

    const collidingActivity: Activity = {
      id: 'act-collision',
      user_id: 'user-1',
      subject_id: null,
      title: 'Reunión de Grupo',
      description: null,
      type: 'meeting',
      status: 'pending',
      start_datetime: '2026-09-21T09:00:00', // Collides with 08:00 - 10:00
      end_datetime: '2026-09-21T10:30:00',
      is_all_day: false,
      priority: 'medium',
      metadata: {},
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    };

    const collisions = detectCollisions([collidingActivity], projected);
    expect(collisions[collidingActivity.id]).toBeDefined();
    expect(collisions[collidingActivity.id].collidedWithNames).toContain('Cálculo Diferencial');
  });
});

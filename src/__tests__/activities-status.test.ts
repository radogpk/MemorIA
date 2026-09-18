import { describe, it, expect } from 'vitest';
import { groupTasksByDueCategory } from '@/lib/tasks/grouping';
import { Activity } from '@/types/database.types';

describe('Task Grouping by Due Date Logic', () => {
  const now = new Date('2026-09-20T12:00:00Z');

  const mockTasks: Activity[] = [
    {
      id: 'task-overdue',
      user_id: 'user-1',
      subject_id: null,
      title: 'Tarea Vencida',
      description: null,
      type: 'task',
      status: 'pending',
      start_datetime: '2026-09-19T23:59:00Z', // Yesterday
      end_datetime: null,
      is_all_day: false,
      priority: 'high',
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'task-today',
      user_id: 'user-1',
      subject_id: null,
      title: 'Tarea Para Hoy',
      description: null,
      type: 'task',
      status: 'pending',
      start_datetime: '2026-09-20T18:00:00Z', // Today
      end_datetime: null,
      is_all_day: false,
      priority: 'medium',
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'task-completed',
      user_id: 'user-1',
      subject_id: null,
      title: 'Tarea Ya Hecha',
      description: null,
      type: 'task',
      status: 'completed',
      start_datetime: '2026-09-18T10:00:00Z',
      end_datetime: null,
      is_all_day: false,
      priority: 'low',
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];

  it('should categorize overdue, today, and completed tasks correctly', () => {
    const groups = groupTasksByDueCategory(mockTasks, now);

    expect(groups.overdue).toHaveLength(1);
    expect(groups.overdue[0].id).toBe('task-overdue');

    expect(groups.today).toHaveLength(1);
    expect(groups.today[0].id).toBe('task-today');

    expect(groups.completed).toHaveLength(1);
    expect(groups.completed[0].id).toBe('task-completed');
  });
});

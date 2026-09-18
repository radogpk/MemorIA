import { describe, it, expect } from 'vitest';
import { DEFAULT_PROFILES } from '@/lib/supabase/data';
import { projectRecurrentClassesForRange, formatActivitiesToCalendarEvents } from '@/lib/calendar/projection';
import type { RecurrentClass, Activity, Subject } from '@/types/database.types';

describe('Duo & Couple Management Engine', () => {
  const mockSubjectLuis: Subject = {
    id: 'sub-luis',
    user_id: 'default-user',
    profile_id: 'prof-luis',
    name: 'Inteligencia Artificial',
    code: 'IA-301',
    color: '#8b5cf6',
    professor: 'Dr. Turing',
    classroom: 'H-205',
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const mockClassLuis: RecurrentClass = {
    id: 'rec-luis',
    user_id: 'default-user',
    profile_id: 'prof-luis',
    subject_id: 'sub-luis',
    day_of_week: 1, // Lunes
    start_time: '08:00',
    end_time: '10:00',
    classroom: 'H-205',
    created_at: '2026-09-01T00:00:00Z',
    subject: mockSubjectLuis,
  };

  const mockSubjectNovia: Subject = {
    id: 'sub-novia',
    user_id: 'default-user',
    profile_id: 'prof-novia',
    name: 'Diseño UX/UI',
    code: 'UX-101',
    color: '#ec4899',
    professor: 'Prof. Norman',
    classroom: 'Lab 3',
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const mockClassNovia: RecurrentClass = {
    id: 'rec-novia',
    user_id: 'default-user',
    profile_id: 'prof-novia',
    subject_id: 'sub-novia',
    day_of_week: 1, // Lunes
    start_time: '10:00',
    end_time: '12:00',
    classroom: 'Lab 3',
    created_at: '2026-09-01T00:00:00Z',
    subject: mockSubjectNovia,
  };

  const mockActivities: Activity[] = [
    {
      id: 'act-luis',
      user_id: 'default-user',
      profile_id: 'prof-luis',
      subject_id: 'sub-luis',
      title: 'Estudiar IA',
      description: null,
      type: 'task',
      status: 'pending',
      start_datetime: '2026-09-21T14:00:00Z',
      end_datetime: '2026-09-21T15:00:00Z',
      is_all_day: false,
      priority: 'medium',
      is_shared: false,
      metadata: {},
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'act-novia',
      user_id: 'default-user',
      profile_id: 'prof-novia',
      subject_id: 'sub-novia',
      title: 'Entrega Figma',
      description: null,
      type: 'task',
      status: 'pending',
      start_datetime: '2026-09-21T16:00:00Z',
      end_datetime: '2026-09-21T17:00:00Z',
      is_all_day: false,
      priority: 'high',
      is_shared: false,
      metadata: {},
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 'act-cita',
      user_id: 'default-user',
      profile_id: 'prof-luis',
      subject_id: null,
      title: '💖 Cita en Pareja',
      description: 'Cena juntos',
      type: 'personal',
      status: 'pending',
      start_datetime: '2026-09-21T20:00:00Z',
      end_datetime: '2026-09-21T22:00:00Z',
      is_all_day: false,
      priority: 'high',
      is_shared: true,
      metadata: {},
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ];

  it('should have default profiles for Luis and partner with zero friction', () => {
    expect(DEFAULT_PROFILES).toHaveLength(2);
    expect(DEFAULT_PROFILES[0].id).toBe('prof-luis');
    expect(DEFAULT_PROFILES[0].role).toBe('owner');
    expect(DEFAULT_PROFILES[1].id).toBe('prof-novia');
    expect(DEFAULT_PROFILES[1].role).toBe('partner');
  });

  it('should preserve profileId and isShared on projected classes and activities', () => {
    const rangeStart = new Date('2026-09-21T00:00:00');
    const rangeEnd = new Date('2026-09-27T23:59:59');

    const projected = projectRecurrentClassesForRange([mockClassLuis, mockClassNovia], rangeStart, rangeEnd);
    expect(projected).toHaveLength(2);
    expect(projected[0].profileId).toBe('prof-luis');
    expect(projected[1].profileId).toBe('prof-novia');

    const formatted = formatActivitiesToCalendarEvents(mockActivities);
    expect(formatted).toHaveLength(3);
    expect(formatted[0].profileId).toBe('prof-luis');
    expect(formatted[0].isShared).toBe(false);
    expect(formatted[1].profileId).toBe('prof-novia');
    expect(formatted[2].isShared).toBe(true);
  });

  it('should correctly filter events in mine, partner, and both modes', () => {
    const rangeStart = new Date('2026-09-21T00:00:00');
    const rangeEnd = new Date('2026-09-27T23:59:59');

    const projected = projectRecurrentClassesForRange([mockClassLuis, mockClassNovia], rangeStart, rangeEnd);
    const formatted = formatActivitiesToCalendarEvents(mockActivities);
    const all = [...projected, ...formatted];

    // Mode 'both'
    expect(all).toHaveLength(5);

    // Mode 'mine' (Luis + shared)
    const mineEvents = all.filter((e) => {
      const pid = e.profileId || e.subject?.profile_id;
      return pid === 'prof-luis' || e.isShared;
    });
    expect(mineEvents.map((e) => e.id)).toEqual(
      expect.arrayContaining(['act-luis', 'act-cita', expect.stringContaining('rec-luis')])
    );
    expect(mineEvents.some((e) => e.id === 'act-novia')).toBe(false);

    // Mode 'partner' (Novia + shared)
    const partnerEvents = all.filter((e) => {
      const pid = e.profileId || e.subject?.profile_id;
      return pid === 'prof-novia' || e.isShared;
    });
    expect(partnerEvents.map((e) => e.id)).toEqual(
      expect.arrayContaining(['act-novia', 'act-cita', expect.stringContaining('rec-novia')])
    );
    expect(partnerEvents.some((e) => e.id === 'act-luis')).toBe(false);
  });
});

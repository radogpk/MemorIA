import { describe, it, expect } from 'vitest';
import { findSmartStudySlots } from '@/lib/calendar/free-slots';
import { CalendarEvent } from '@/lib/calendar/types';

describe('Smart Study Slot Planner Engine', () => {
  it('should find free slots between busy classes for study blocks', () => {
    // A Monday with a class from 07:00 to 09:00 and work from 15:30 to 18:00
    const targetDay = new Date('2026-09-21T00:00:00');
    
    const busyEvents: CalendarEvent[] = [
      {
        id: 'class-1',
        title: 'Innovación',
        start: new Date('2026-09-21T07:00:00'),
        end: new Date('2026-09-21T09:00:00'),
        type: 'class',
      },
      {
        id: 'work-1',
        title: 'Trabajo Continuo',
        start: new Date('2026-09-21T09:30:00'),
        end: new Date('2026-09-21T13:30:00'),
        type: 'class',
      },
      {
        id: 'class-so',
        title: 'Sistemas Operativos',
        start: new Date('2026-09-21T14:00:00'),
        end: new Date('2026-09-21T15:30:00'),
        type: 'class',
      },
      {
        id: 'work-2',
        title: 'Trabajo',
        start: new Date('2026-09-21T15:30:00'),
        end: new Date('2026-09-21T18:00:00'),
        type: 'class',
      },
    ];

    // Look for free slots between 18:00 and 21:00 on that Monday
    const slots = findSmartStudySlots(targetDay, busyEvents, 60);

    expect(slots.length).toBeGreaterThanOrEqual(1);
    // There should be a free slot in the evening starting at 18:00
    const eveningSlot = slots.find((s) => s.start.getHours() >= 18);
    expect(eveningSlot).toBeDefined();
    expect(eveningSlot?.durationMinutes).toBeGreaterThanOrEqual(60);
  });
});

import { describe, it, expect } from 'vitest';
import { generateIcsCalendarContent } from '@/lib/calendar/ics-export';
import { INITIAL_SUBJECTS, INITIAL_RECURRENT_CLASSES, getInitialActivities } from '@/lib/storage/initial-data';

describe('ICS Calendar Export Engine (RFC 5545)', () => {
  it('should generate valid RFC 5545 calendar structure', () => {
    const subjects = INITIAL_SUBJECTS;
    const recurrentClasses = INITIAL_RECURRENT_CLASSES;
    const activities = getInitialActivities();

    const icsContent = generateIcsCalendarContent(subjects, recurrentClasses, activities);

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('PRODID:-//memorIA//ES');
    expect(icsContent).toContain('END:VCALENDAR');

    // Should include weekly recurrence rules for classes
    expect(icsContent).toContain('RRULE:FREQ=WEEKLY');
    expect(icsContent).toContain('SUMMARY:Innovación');

    // Should include activities (exams / tasks)
    expect(icsContent).toContain('SUMMARY:[EXAMEN] Examen Parcial');
  });
});

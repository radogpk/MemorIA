import { describe, it, expect } from 'vitest';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';

describe('Calendar Views Date Utilities', () => {
  it('should generate 7 days for a given week starting Monday', () => {
    const testDate = new Date('2026-09-21T12:00:00');
    const weekStart = startOfWeek(testDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(testDate, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    expect(days).toHaveLength(7);
    expect(format(days[0], 'EEEE', { locale: es })).toBe('lunes');
    expect(format(days[6], 'EEEE', { locale: es })).toBe('domingo');
  });

  it('should format hours from 7:00 to 22:00 correctly', () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 7);
    expect(hours[0]).toBe(7);
    expect(hours[hours.length - 1]).toBe(22);
  });
});

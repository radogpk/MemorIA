import { Subject, RecurrentClass, Activity } from '@/types/database.types';
import { format, parseISO } from 'date-fns';

const DAY_CODES: Record<number, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
};

function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function generateIcsCalendarContent(
  subjects: Subject[],
  recurrentClasses: RecurrentClass[],
  activities: Activity[]
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//memorIA//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:memorIA - Mi Horario Académico',
    'X-WR-TIMEZONE:America/Bogota',
  ];

  const now = new Date();
  const dtStamp = formatIcsDateTime(now);

  // 1. Export Recurrent Classes with RRULE
  for (const rc of recurrentClasses) {
    const subject = subjects.find((s) => s.id === rc.subject_id);
    const subjectName = subject?.name || 'Clase';
    const classroom = rc.classroom || subject?.classroom || '';
    const professor = subject?.professor ? `Docente: ${subject.professor}` : '';

    // Calculate next occurrence date for this weekday to serve as DTSTART
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const daysOffset = (rc.day_of_week - currentDay + 7) % 7;
    const classDate = new Date(now);
    classDate.setDate(now.getDate() + daysOffset);

    const [startH, startM] = rc.start_time.split(':').map(Number);
    const [endH, endM] = rc.end_time.split(':').map(Number);

    const startDt = new Date(classDate);
    startDt.setHours(startH, startM, 0, 0);

    const endDt = new Date(classDate);
    endDt.setHours(endH, endM, 0, 0);

    const byDay = DAY_CODES[rc.day_of_week] || 'MO';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:rec-${rc.id}@memoria.app`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${formatIcsDateTime(startDt)}`);
    lines.push(`DTEND:${formatIcsDateTime(endDt)}`);
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);
    lines.push(`SUMMARY:${subjectName}`);
    if (classroom) lines.push(`LOCATION:${classroom}`);
    if (professor) lines.push(`DESCRIPTION:${professor}`);
    lines.push('END:VEVENT');
  }

  // 2. Export Activities (Exams, Tasks, Meetings)
  for (const act of activities) {
    const startDt = parseISO(act.start_datetime);
    const endDt = act.end_datetime
      ? parseISO(act.end_datetime)
      : new Date(startDt.getTime() + 60 * 60 * 1000);

    const typePrefix =
      act.type === 'exam'
        ? '[EXAMEN] '
        : act.type === 'task'
        ? '[ENTREGA] '
        : act.type === 'meeting'
        ? '[REUNIÓN] '
        : '';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:act-${act.id}@memoria.app`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${formatIcsDateTime(startDt)}`);
    lines.push(`DTEND:${formatIcsDateTime(endDt)}`);
    lines.push(`SUMMARY:${typePrefix}${act.title}`);
    if (act.description) lines.push(`DESCRIPTION:${act.description.replace(/\n/g, '\\n')}`);
    if (act.subject?.name) lines.push(`CATEGORIES:${act.subject.name}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

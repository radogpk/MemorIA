import { Subject, RecurrentClass, Activity } from '@/types/database.types';

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-calc',
    user_id: 'default-user',
    name: 'Cálculo Diferencial',
    code: 'MAT-101',
    color: '#3b82f6',
    professor: 'Dr. Gauss',
    classroom: 'Aula 204',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-redes',
    user_id: 'default-user',
    name: 'Redes de Computadoras',
    code: 'RED-201',
    color: '#06b6d4',
    professor: 'Ing. Tanenbaum',
    classroom: 'Lab Redes 3',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-ed',
    user_id: 'default-user',
    name: 'Estructuras de Datos',
    code: 'CS-103',
    color: '#10b981',
    professor: 'Dra. Lovelace',
    classroom: 'Aula 102',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const INITIAL_RECURRENT_CLASSES: RecurrentClass[] = [
  // Cálculo: Lunes y Miércoles 08:00 - 10:00
  {
    id: 'rec-calc-lun',
    user_id: 'default-user',
    subject_id: 'sub-calc',
    day_of_week: 1, // Lunes
    start_time: '08:00',
    end_time: '10:00',
    classroom: 'Aula 204',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[0],
  },
  {
    id: 'rec-calc-mie',
    user_id: 'default-user',
    subject_id: 'sub-calc',
    day_of_week: 3, // Miércoles
    start_time: '08:00',
    end_time: '10:00',
    classroom: 'Aula 204',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[0],
  },
  // Redes: Martes y Jueves 10:00 - 12:00
  {
    id: 'rec-redes-mar',
    user_id: 'default-user',
    subject_id: 'sub-redes',
    day_of_week: 2, // Martes
    start_time: '10:00',
    end_time: '12:00',
    classroom: 'Lab Redes 3',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[1],
  },
  {
    id: 'rec-redes-jue',
    user_id: 'default-user',
    subject_id: 'sub-redes',
    day_of_week: 4, // Jueves
    start_time: '10:00',
    end_time: '12:00',
    classroom: 'Lab Redes 3',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[1],
  },
  // Estructuras de Datos: Viernes 14:00 - 17:00
  {
    id: 'rec-ed-vie',
    user_id: 'default-user',
    subject_id: 'sub-ed',
    day_of_week: 5, // Viernes
    start_time: '14:00',
    end_time: '17:00',
    classroom: 'Aula 102',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[2],
  },
];

export function getInitialActivities(): Activity[] {
  const now = new Date();
  
  // Tarea de cálculo para mañana a las 23:59
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(23, 59, 0, 0);

  // Examen de Redes para el próximo martes a las 10:00
  const nextExam = new Date(now);
  nextExam.setDate(now.getDate() + 5);
  nextExam.setHours(10, 0, 0, 0);
  const nextExamEnd = new Date(nextExam);
  nextExamEnd.setHours(12, 0, 0, 0);

  // Reunión de proyecto para pasado mañana a las 15:00
  const meeting = new Date(now);
  meeting.setDate(now.getDate() + 2);
  meeting.setHours(15, 0, 0, 0);
  const meetingEnd = new Date(meeting);
  meetingEnd.setHours(16, 30, 0, 0);

  return [
    {
      id: 'act-exam-redes',
      user_id: 'default-user',
      subject_id: 'sub-redes',
      title: 'Examen Parcial 1: Modelo OSI y Subnetting',
      description: 'Entran unidades 1, 2 y 3. Llevar calculadora.',
      type: 'exam',
      status: 'pending',
      start_datetime: nextExam.toISOString(),
      end_datetime: nextExamEnd.toISOString(),
      is_all_day: false,
      priority: 'high',
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      subject: INITIAL_SUBJECTS[1],
    },
    {
      id: 'act-task-calc',
      user_id: 'default-user',
      subject_id: 'sub-calc',
      title: 'Taller de Derivadas Implícitas',
      description: 'Ejercicios impares del capítulo 3 del Stewart.',
      type: 'task',
      status: 'pending',
      start_datetime: tomorrow.toISOString(),
      end_datetime: null,
      is_all_day: false,
      priority: 'medium',
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      subject: INITIAL_SUBJECTS[0],
    },
    {
      id: 'act-meeting-proj',
      user_id: 'default-user',
      subject_id: null,
      title: 'Reunión de Equipo: Proyecto Final',
      description: 'Videollamada en Google Meet para repartir módulos.',
      type: 'meeting',
      status: 'pending',
      start_datetime: meeting.toISOString(),
      end_datetime: meetingEnd.toISOString(),
      is_all_day: false,
      priority: 'medium',
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];
}

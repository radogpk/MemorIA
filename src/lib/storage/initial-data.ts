import { Subject, RecurrentClass, Activity } from '@/types/database.types';
import { GERARDO_PROFILE_ID, EVEBEBE_PROFILE_ID } from '@/lib/supabase/data';

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-innovacion',
    user_id: 'default-user',
    profile_id: GERARDO_PROFILE_ID,
    name: 'Innovación',
    code: 'INN-101',
    color: '#f59e0b',
    professor: 'Profesor de Innovación',
    classroom: 'H-203',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-discreta',
    user_id: 'default-user',
    profile_id: GERARDO_PROFILE_ID,
    name: 'Matemática Discreta',
    code: 'DISC-102',
    color: '#ec4899',
    professor: 'Profesor de Discreta',
    classroom: 'H-202',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-estadistica',
    user_id: 'default-user',
    profile_id: GERARDO_PROFILE_ID,
    name: 'Estadística y Probabilidades',
    code: 'EST-201',
    color: '#eab308',
    professor: 'Plaza a Contratar',
    classroom: 'H-202',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-ia',
    user_id: 'default-user',
    profile_id: GERARDO_PROFILE_ID,
    name: 'Inteligencia Artificial',
    code: 'IA-301',
    color: '#8b5cf6',
    professor: 'Profesor de IA',
    classroom: 'H-205',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-arq-soft',
    user_id: 'default-user',
    profile_id: GERARDO_PROFILE_ID,
    name: 'Arquitectura de Software',
    code: 'ARQ-302',
    color: '#10b981',
    professor: 'Profesor de Arquitectura',
    classroom: 'H-205',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-sist-oper',
    user_id: 'default-user',
    profile_id: GERARDO_PROFILE_ID,
    name: 'Sistemas Operativos',
    code: 'SO-203',
    color: '#06b6d4',
    professor: 'Profesor de Sistemas Operativos',
    classroom: 'H-203',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-trabajo',
    user_id: 'default-user',
    profile_id: GERARDO_PROFILE_ID,
    name: 'Trabajo Continuo',
    code: 'TRAB',
    color: '#64748b',
    professor: null,
    classroom: 'Remoto / Oficina',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Cursos de Mi Novia (Pareja)
  {
    id: 'sub-novia-ux',
    user_id: 'default-user',
    profile_id: EVEBEBE_PROFILE_ID,
    name: 'Diseño UX/UI & Prototipado',
    code: 'UX-101',
    color: '#ec4899',
    professor: 'Docente UX',
    classroom: 'Lab Creativo 3',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sub-novia-mkt',
    user_id: 'default-user',
    profile_id: EVEBEBE_PROFILE_ID,
    name: 'Marketing Digital & Métricas',
    code: 'MKT-202',
    color: '#f43f5e',
    professor: 'Docente Marketing',
    classroom: 'A-104',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const INITIAL_RECURRENT_CLASSES: RecurrentClass[] = [
  // 1. INNOVACIÓN
  // Lunes 07:00 - 09:00 (Teoría / H-203)
  {
    id: 'rec-inn-lun',
    user_id: 'default-user',
    subject_id: 'sub-innovacion',
    day_of_week: 1,
    start_time: '07:00',
    end_time: '09:00',
    classroom: 'Teoría / H-203',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[0],
  },
  // Viernes 18:00 - 20:00 (Lab 01 (H-212))
  {
    id: 'rec-inn-vie',
    user_id: 'default-user',
    subject_id: 'sub-innovacion',
    day_of_week: 5,
    start_time: '18:00',
    end_time: '20:00',
    classroom: 'Lab 01 (H-212)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[0],
  },

  // 2. MATEMÁTICA DISCRETA
  // Miércoles 07:00 - 09:00 (H-202)
  {
    id: 'rec-disc-mie',
    user_id: 'default-user',
    subject_id: 'sub-discreta',
    day_of_week: 3,
    start_time: '07:00',
    end_time: '09:00',
    classroom: 'H-202',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[1],
  },
  // Jueves 09:00 - 10:00 (H-202)
  {
    id: 'rec-disc-jue',
    user_id: 'default-user',
    subject_id: 'sub-discreta',
    day_of_week: 4,
    start_time: '09:00',
    end_time: '10:00',
    classroom: 'H-202',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[1],
  },

  // 3. ESTADÍSTICA Y PROBABILIDADES
  // Jueves 07:00 - 09:00 (H-202)
  {
    id: 'rec-est-jue',
    user_id: 'default-user',
    subject_id: 'sub-estadistica',
    day_of_week: 4,
    start_time: '07:00',
    end_time: '09:00',
    classroom: 'H-202',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[2],
  },
  // Miércoles 11:00 - 13:00 (Lab: Estadística y Prob. / Lab 05)
  {
    id: 'rec-est-mie',
    user_id: 'default-user',
    subject_id: 'sub-estadistica',
    day_of_week: 3,
    start_time: '11:00',
    end_time: '13:00',
    classroom: 'Lab 05 / Plaza a Contratar',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[2],
  },
  // Viernes 14:00 - 16:00 (H-202)
  {
    id: 'rec-est-vie',
    user_id: 'default-user',
    subject_id: 'sub-estadistica',
    day_of_week: 5,
    start_time: '14:00',
    end_time: '16:00',
    classroom: 'H-202',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[2],
  },

  // 4. INTELIGENCIA ARTIFICIAL
  // Viernes 07:00 - 09:00 (Lab: IA I / Lab 01 (H-212))
  {
    id: 'rec-ia-vie',
    user_id: 'default-user',
    subject_id: 'sub-ia',
    day_of_week: 5,
    start_time: '07:00',
    end_time: '09:00',
    classroom: 'Lab 01 (H-212)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[3],
  },
  // Martes 16:00 - 18:00 (H-205)
  {
    id: 'rec-ia-mar',
    user_id: 'default-user',
    subject_id: 'sub-ia',
    day_of_week: 2,
    start_time: '16:00',
    end_time: '18:00',
    classroom: 'H-205',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[3],
  },
  // Jueves 17:00 - 18:00 (H-205)
  {
    id: 'rec-ia-jue',
    user_id: 'default-user',
    subject_id: 'sub-ia',
    day_of_week: 4,
    start_time: '17:00',
    end_time: '18:00',
    classroom: 'H-205',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[3],
  },

  // 5. ARQUITECTURA DE SOFTWARE
  // Sábado 09:00 - 11:00 (Lab: Arq. Software / Lab 01 (H-212))
  {
    id: 'rec-arq-sab',
    user_id: 'default-user',
    subject_id: 'sub-arq-soft',
    day_of_week: 6,
    start_time: '09:00',
    end_time: '11:00',
    classroom: 'Lab 01 (H-212)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[4],
  },
  // Viernes 16:00 - 18:00 (H-205)
  {
    id: 'rec-arq-vie',
    user_id: 'default-user',
    subject_id: 'sub-arq-soft',
    day_of_week: 5,
    start_time: '16:00',
    end_time: '18:00',
    classroom: 'H-205',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[4],
  },
  // Martes 18:00 - 19:00 (H-205)
  {
    id: 'rec-arq-mar',
    user_id: 'default-user',
    subject_id: 'sub-arq-soft',
    day_of_week: 2,
    start_time: '18:00',
    end_time: '19:00',
    classroom: 'H-205',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[4],
  },

  // 6. SISTEMAS OPERATIVOS
  // Lunes 14:00 - 15:30 (H-203)
  {
    id: 'rec-so-lun',
    user_id: 'default-user',
    subject_id: 'sub-sist-oper',
    day_of_week: 1,
    start_time: '14:00',
    end_time: '15:30',
    classroom: 'H-203',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[5],
  },
  // Miércoles 14:00 - 16:00 (H-203)
  {
    id: 'rec-so-mie',
    user_id: 'default-user',
    subject_id: 'sub-sist-oper',
    day_of_week: 3,
    start_time: '14:00',
    end_time: '16:00',
    classroom: 'H-203',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[5],
  },
  // Jueves 18:00 - 20:00 (Lab: Sist. Operativos / Lab 02 (H-213))
  {
    id: 'rec-so-jue',
    user_id: 'default-user',
    subject_id: 'sub-sist-oper',
    day_of_week: 4,
    start_time: '18:00',
    end_time: '20:00',
    classroom: 'Lab 02 (H-213)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[5],
  },

  // 7. TRABAJO CONTINUO
  // Lunes 09:30 - 13:30 (4.0 hrs)
  {
    id: 'rec-trab-lun-1',
    user_id: 'default-user',
    subject_id: 'sub-trabajo',
    day_of_week: 1,
    start_time: '09:30',
    end_time: '13:30',
    classroom: 'Trabajo Continuo (4.0h)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[6],
  },
  // Lunes 15:30 - 18:00 (2.5 hrs)
  {
    id: 'rec-trab-lun-2',
    user_id: 'default-user',
    subject_id: 'sub-trabajo',
    day_of_week: 1,
    start_time: '15:30',
    end_time: '18:00',
    classroom: 'Trabajo (2.5h)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[6],
  },
  // Martes 08:00 - 13:30 (5.5 hrs)
  {
    id: 'rec-trab-mar-1',
    user_id: 'default-user',
    subject_id: 'sub-trabajo',
    day_of_week: 2,
    start_time: '08:00',
    end_time: '13:30',
    classroom: 'Trabajo Continuo (5.5h)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[6],
  },
  // Martes 14:00 - 16:00 (2.0 hrs)
  {
    id: 'rec-trab-mar-2',
    user_id: 'default-user',
    subject_id: 'sub-trabajo',
    day_of_week: 2,
    start_time: '14:00',
    end_time: '16:00',
    classroom: 'Trabajo (2.0h)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[6],
  },
  // Jueves 10:30 - 17:00 (6.5 hrs)
  {
    id: 'rec-trab-jue',
    user_id: 'default-user',
    subject_id: 'sub-trabajo',
    day_of_week: 4,
    start_time: '10:30',
    end_time: '17:00',
    classroom: 'Trabajo Continuo (6.5h)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[6],
  },
  // Viernes 09:30 - 13:30 (4.0 hrs)
  {
    id: 'rec-trab-vie',
    user_id: 'default-user',
    subject_id: 'sub-trabajo',
    day_of_week: 5,
    start_time: '09:30',
    end_time: '13:30',
    classroom: 'Trabajo Continuo (4.0h)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[6],
  },
  // Sábado 11:30 - 18:00 (6.5 hrs)
  {
    id: 'rec-trab-sab',
    user_id: 'default-user',
    subject_id: 'sub-trabajo',
    day_of_week: 6,
    start_time: '11:30',
    end_time: '18:00',
    classroom: 'Trabajo Continuo (6.5h)',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[6],
  },
  // Recurrent classes de Mi Novia (Pareja)
  // Martes 10:00 - 12:00 (Diseño UX/UI)
  {
    id: 'rec-novia-ux-mar',
    user_id: 'default-user',
    profile_id: EVEBEBE_PROFILE_ID,
    subject_id: 'sub-novia-ux',
    day_of_week: 2,
    start_time: '10:00',
    end_time: '12:00',
    classroom: 'Lab Creativo 3',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[7],
  },
  // Jueves 10:00 - 12:00 (Diseño UX/UI)
  {
    id: 'rec-novia-ux-jue',
    user_id: 'default-user',
    profile_id: EVEBEBE_PROFILE_ID,
    subject_id: 'sub-novia-ux',
    day_of_week: 4,
    start_time: '10:00',
    end_time: '12:00',
    classroom: 'Lab Creativo 3',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[7],
  },
  // Viernes 14:00 - 16:00 (Marketing Digital)
  {
    id: 'rec-novia-mkt-vie',
    user_id: 'default-user',
    profile_id: EVEBEBE_PROFILE_ID,
    subject_id: 'sub-novia-mkt',
    day_of_week: 5,
    start_time: '14:00',
    end_time: '16:00',
    classroom: 'A-104',
    created_at: new Date().toISOString(),
    subject: INITIAL_SUBJECTS[8],
  },
];

export function getInitialActivities(): Activity[] {
  const now = new Date();
  
  // Tarea para mañana
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(23, 59, 0, 0);

  // Examen de Inteligencia Artificial para el próximo martes a las 16:00
  const nextExam = new Date(now);
  nextExam.setDate(now.getDate() + ((2 + 7 - now.getDay()) % 7 || 7));
  nextExam.setHours(16, 0, 0, 0);
  const nextExamEnd = new Date(nextExam);
  nextExamEnd.setHours(18, 0, 0, 0);

  // Cita de pareja para este viernes o sábado a las 19:00
  const coupleDate = new Date(now);
  coupleDate.setDate(now.getDate() + ((6 + 7 - now.getDay()) % 7 || 1));
  coupleDate.setHours(19, 0, 0, 0);
  const coupleDateEnd = new Date(coupleDate);
  coupleDateEnd.setHours(21, 30, 0, 0);

  return [
    {
      id: 'act-exam-ia',
      user_id: 'default-user',
      profile_id: GERARDO_PROFILE_ID,
      subject_id: 'sub-ia',
      title: 'Examen Parcial: Redes Neuronales y Búsqueda Heurística',
      description: 'Aula H-205. Llevar apuntes permitidos.',
      type: 'exam',
      status: 'pending',
      start_datetime: nextExam.toISOString(),
      end_datetime: nextExamEnd.toISOString(),
      is_all_day: false,
      priority: 'high',
      is_shared: false,
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      subject: INITIAL_SUBJECTS[3],
    },
    {
      id: 'act-task-arq',
      user_id: 'default-user',
      profile_id: GERARDO_PROFILE_ID,
      subject_id: 'sub-arq-soft',
      title: 'Entrega de Diagrama de Microservicios',
      description: 'Documentar arquitectura hexagonal en formato PDF.',
      type: 'task',
      status: 'pending',
      start_datetime: tomorrow.toISOString(),
      end_datetime: null,
      is_all_day: false,
      priority: 'medium',
      is_shared: false,
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      subject: INITIAL_SUBJECTS[4],
    },
    // Actividad compartida en pareja
    {
      id: 'act-cita-pareja',
      user_id: 'default-user',
      profile_id: GERARDO_PROFILE_ID,
      subject_id: null,
      title: '💖 Cita / Cena & Paseo juntos',
      description: 'Salir a cenar y ver una película.',
      type: 'personal',
      status: 'pending',
      start_datetime: coupleDate.toISOString(),
      end_datetime: coupleDateEnd.toISOString(),
      is_all_day: false,
      priority: 'high',
      is_shared: true,
      metadata: { couple: true },
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      subject: null,
    },
    // Tarea de la pareja
    {
      id: 'act-novia-ux',
      user_id: 'default-user',
      profile_id: EVEBEBE_PROFILE_ID,
      subject_id: 'sub-novia-ux',
      title: 'Entrega de Wireframes de App Móvil en Figma',
      description: 'Subir enlace público del prototipo interactivo.',
      type: 'task',
      status: 'pending',
      start_datetime: tomorrow.toISOString(),
      end_datetime: null,
      is_all_day: false,
      priority: 'high',
      is_shared: false,
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      subject: INITIAL_SUBJECTS[7],
    },
  ];
}

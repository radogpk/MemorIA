import { Subject, Activity, RecurrentClass } from '@/types/database.types';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: 'class' | 'task' | 'exam' | 'meeting' | 'personal';
  status?: string;
  priority?: string;
  subject?: Subject | null;
  classroom?: string | null;
  professor?: string | null;
  isRecurrent?: boolean;
  sourceActivity?: Activity;
  sourceRecurrentClass?: RecurrentClass;
  hasCollision?: boolean;
  collisionWith?: string[];
  profileId?: string | null;
  profileName?: string;
  isShared?: boolean;
}

export type CalendarViewMode = 'day' | 'week' | 'month';
export type DuoViewMode = 'mine' | 'partner' | 'both';

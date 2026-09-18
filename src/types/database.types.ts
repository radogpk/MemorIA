export type ActivityType = 'task' | 'exam' | 'meeting' | 'personal';
export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  color: string;
  professor: string | null;
  classroom: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurrentClass {
  id: string;
  user_id: string;
  subject_id: string;
  day_of_week: number; // 1 = Lunes ... 7 = Domingo
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  classroom: string | null;
  created_at: string;
  // Joins opcionales
  subject?: Subject;
}

export interface Activity {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  type: ActivityType;
  status: ActivityStatus;
  start_datetime: string; // ISO 8601
  end_datetime: string | null; // ISO 8601
  is_all_day: boolean;
  priority: ActivityPriority;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  subject?: Subject | null;
}

// Input Types
export type CreateSubjectInput = Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateSubjectInput = Partial<CreateSubjectInput>;

export type CreateRecurrentClassInput = Omit<RecurrentClass, 'id' | 'user_id' | 'created_at' | 'subject'>;
export type UpdateRecurrentClassInput = Partial<CreateRecurrentClassInput>;

export type CreateActivityInput = Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'subject'>;
export type UpdateActivityInput = Partial<CreateActivityInput>;

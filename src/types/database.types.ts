export type ActivityType = "task" | "exam" | "meeting" | "personal";
export type ActivityStatus =
  "pending" | "in_progress" | "completed" | "cancelled";
export type ActivityPriority = "low" | "medium" | "high" | "urgent";

export interface UserProfile {
  id: string;
  name: string;
  nickname?: string | null;
  avatar_color: string;
  role: "owner" | "partner" | "user";
  created_at: string;
  schedule?: {
    holiday_policy: "skip" | "attend";
    holidays: { date: string; name: string }[];
    travel_minutes: number;
  };
}

export interface AcademicTerm {
  name: string;
  start_date: string;
  end_date: string;
}
export interface SessionException {
  date: string;
  action: "cancel" | "override";
  start_time?: string;
  end_time?: string;
  classroom?: string | null;
  professor?: string | null;
  note?: string;
}

export interface Subject {
  id: string;
  user_id?: string;
  profile_id?: string | null;
  name: string;
  code: string | null;
  color: string;
  professor: string | null;
  classroom: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  term?: AcademicTerm | null;
  holiday_policy?: "inherit" | "skip" | "attend";
}

export interface RecurrentClass {
  id: string;
  user_id?: string;
  profile_id?: string | null;
  subject_id: string;
  day_of_week: number; // 1 = Lunes ... 7 = Domingo
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  classroom: string | null;
  session_type?: "theory" | "laboratory" | "practice";
  professor?: string | null;
  created_at: string;
  exceptions?: SessionException[];
  // Joins opcionales
  subject?: Subject;
}

export interface Activity {
  id: string;
  user_id?: string;
  profile_id?: string | null;
  subject_id: string | null;
  title: string;
  description: string | null;
  type: ActivityType;
  status: ActivityStatus;
  start_datetime: string; // ISO 8601
  end_datetime: string | null; // ISO 8601
  is_all_day: boolean;
  priority: ActivityPriority;
  is_shared?: boolean; // Visible para ambos perfiles (citas, almuerzos juntos)
  invitation?: {
    proposed_by?: string;
    previous_start?: string;
    previous_end?: string | null;
    recipient_id: string;
    status: "pending" | "accepted" | "declined";
    responded_at: string | null;
  } | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  subject?: Subject | null;
}

// Input Types
export type CreateSubjectInput = Omit<
  Subject,
  "id" | "created_at" | "updated_at"
>;
export type UpdateSubjectInput = Partial<CreateSubjectInput>;

export type CreateRecurrentClassInput = Omit<
  RecurrentClass,
  "id" | "created_at" | "subject"
>;
export type UpdateRecurrentClassInput = Partial<CreateRecurrentClassInput>;

export type CreateActivityInput = Omit<
  Activity,
  "id" | "created_at" | "updated_at" | "subject"
>;
export type UpdateActivityInput = Partial<CreateActivityInput>;

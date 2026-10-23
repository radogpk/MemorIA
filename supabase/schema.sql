-- Fresh installation. Existing installations apply only the migration.
-- Then run migrations/20261022_reliable_storage.sql in the same project.
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(60) NOT NULL,
  nickname varchar(60), avatar_color varchar(10) NOT NULL DEFAULT '#7cb8df',
  role varchar(20) NOT NULL DEFAULT 'user', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid REFERENCES public.user_profiles(id), user_id uuid,
  name varchar(100) NOT NULL, code varchar(20), color varchar(10) NOT NULL DEFAULT '#7cb8df',
  professor varchar(100), classroom varchar(100), is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recurrent_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid REFERENCES public.user_profiles(id),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL, end_time time NOT NULL CHECK(end_time > start_time),
  classroom varchar(100), professor varchar(100), session_type text NOT NULL DEFAULT 'theory' CHECK(session_type IN ('theory','laboratory','practice')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid REFERENCES public.user_profiles(id),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title varchar(150) NOT NULL, description text,
  type text NOT NULL CHECK(type IN ('task','exam','meeting','personal')),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','cancelled')),
  start_datetime timestamptz NOT NULL, end_datetime timestamptz,
  is_all_day boolean NOT NULL DEFAULT false, priority text NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
  is_shared boolean NOT NULL DEFAULT false, invitation jsonb, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(end_datetime IS NULL OR end_datetime > start_datetime)
);
CREATE INDEX IF NOT EXISTS idx_subjects_profile ON public.subjects(profile_id);
CREATE INDEX IF NOT EXISTS idx_recurrent_classes_subject ON public.recurrent_classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_activities_profile ON public.activities(profile_id);
CREATE INDEX IF NOT EXISTS idx_activities_dates ON public.activities(start_datetime);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrent_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

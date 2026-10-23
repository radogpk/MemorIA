-- ==============================================================================
-- memorIA - Script Completo de Inicialización y Migración para Supabase
-- ==============================================================================
-- Este script es 100% idempotente: es seguro ejecutarlo en una base de datos nueva
-- o en un proyecto existente. No borra datos previos.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLAS PRINCIPALES
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(60) NOT NULL,
  nickname varchar(60),
  avatar_color varchar(10) NOT NULL DEFAULT '#7cb8df',
  role varchar(20) NOT NULL DEFAULT 'user',
  schedule jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.user_profiles(id),
  user_id uuid,
  name varchar(100) NOT NULL,
  code varchar(20),
  color varchar(10) NOT NULL DEFAULT '#7cb8df',
  professor varchar(100),
  classroom varchar(100),
  is_active boolean NOT NULL DEFAULT true,
  term jsonb,
  holiday_policy text NOT NULL DEFAULT 'inherit',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurrent_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.user_profiles(id),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK(end_time > start_time),
  classroom varchar(100),
  professor varchar(100),
  session_type text NOT NULL DEFAULT 'theory' CHECK(session_type IN ('theory','laboratory','practice')),
  exceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.user_profiles(id),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title varchar(150) NOT NULL,
  description text,
  type text NOT NULL CHECK(type IN ('task','exam','meeting','personal')),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','cancelled')),
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  is_all_day boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
  is_shared boolean NOT NULL DEFAULT false,
  invitation jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(end_datetime IS NULL OR end_datetime > start_datetime)
);

CREATE TABLE IF NOT EXISTS public.memoria_batches (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.memoria_push_devices (
  id text PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  endpoint text UNIQUE NOT NULL,
  keys jsonb NOT NULL,
  token_hash text NOT NULL,
  reminder_minutes integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.memoria_push_deliveries (
  id text PRIMARY KEY,
  device_id text NOT NULL REFERENCES public.memoria_push_devices(id) ON DELETE CASCADE,
  job jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sent','discarded')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz
);

-- 2. AJUSTES RETROCOMPATIBLES (Si ya existían las tablas)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS schedule jsonb;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS term jsonb;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS holiday_policy text NOT NULL DEFAULT 'inherit';
ALTER TABLE public.recurrent_classes ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'theory';
ALTER TABLE public.recurrent_classes ADD COLUMN IF NOT EXISTS professor text;
ALTER TABLE public.recurrent_classes ADD COLUMN IF NOT EXISTS exceptions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS invitation jsonb;

-- 3. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_subjects_profile ON public.subjects(profile_id);
CREATE INDEX IF NOT EXISTS idx_recurrent_classes_subject ON public.recurrent_classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_activities_profile ON public.activities(profile_id);
CREATE INDEX IF NOT EXISTS idx_activities_dates ON public.activities(start_datetime);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_pending ON public.memoria_push_deliveries(state, available_at) WHERE state = 'pending';

-- 4. SEGURIDAD (ROW LEVEL SECURITY)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrent_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memoria_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memoria_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memoria_push_deliveries ENABLE ROW LEVEL SECURITY;

-- 5. PERFILES PRECONFIGURADOS (Gerardo y Norely)
INSERT INTO public.user_profiles(id, name, nickname, avatar_color, role, schedule) VALUES
('727db856-313b-4c91-91e4-7fac976dfc6d', 'Gerardo', 'Principito', '#3b82f6', 'owner',
 jsonb_build_object('holiday_policy', 'skip', 'holidays', '[]'::jsonb, 'travel_minutes', 0)),
('1e12d23b-f0b2-49d4-ae4b-b602226c7d14', 'Norely', 'Evebebé', '#ec4899', 'partner',
 jsonb_build_object('holiday_policy', 'attend', 'holidays', '[]'::jsonb, 'travel_minutes', 0))
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  nickname = EXCLUDED.nickname,
  avatar_color = EXCLUDED.avatar_color,
  role = EXCLUDED.role,
  schedule = COALESCE(user_profiles.schedule, EXCLUDED.schedule);

-- 6. FUNCIONES DEL SERVIDOR (RPC)

-- Consulta snapshot completo
CREATE OR REPLACE FUNCTION public.memoria_snapshot() RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'profiles', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM user_profiles p WHERE p.id IN ('727db856-313b-4c91-91e4-7fac976dfc6d','1e12d23b-f0b2-49d4-ae4b-b602226c7d14')), '[]'::jsonb),
    'subjects', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM subjects s), '[]'::jsonb),
    'recurrentClasses', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM recurrent_classes c), '[]'::jsonb),
    'activities', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM activities a), '[]'::jsonb)
  );
$$;

-- Detección de períodos ocupados (cruces de horarios de pareja)
CREATE OR REPLACE FUNCTION public.memoria_busy_periods(p_day date, p_profile uuid, p_exclude uuid)
RETURNS TABLE(title text, starts timestamptz, ends timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH settings AS (
   SELECT COALESCE(schedule, jsonb_build_object('holiday_policy','attend','holidays','[]'::jsonb,'travel_minutes',0)) AS prefs,
     make_interval(mins=>COALESCE((schedule->>'travel_minutes')::int,0)) AS gap FROM user_profiles WHERE id=p_profile
 ), occurrences AS (
   SELECT s.name::text AS title, (d::date + COALESCE((x.value->>'start_time')::time, c.start_time)) AT TIME ZONE 'America/Lima' AS starts,
     (d::date + COALESCE((x.value->>'end_time')::time, c.end_time)) AT TIME ZONE 'America/Lima' AS ends, settings.gap
   FROM recurrent_classes c JOIN subjects s ON s.id = c.subject_id CROSS JOIN settings
   CROSS JOIN generate_series(p_day - 1, p_day + 1, interval '1 day') AS d
   LEFT JOIN LATERAL (SELECT value FROM jsonb_array_elements(c.exceptions) WHERE value->>'date' = d::date::text LIMIT 1) x ON true
   WHERE s.profile_id = p_profile AND s.is_active AND c.day_of_week = extract(isodow FROM d)
     AND (s.term IS NULL OR (d::date BETWEEN (s.term->>'start_date')::date AND (s.term->>'end_date')::date))
     AND COALESCE(x.value->>'action', '') <> 'cancel'
     AND (x.value IS NOT NULL OR COALESCE(NULLIF(s.holiday_policy, 'inherit'), settings.prefs->>'holiday_policy') <> 'skip'
       OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(settings.prefs->'holidays', '[]'::jsonb)) h WHERE h->>'date' = d::date::text))
 ), activity_times AS (
   SELECT a.title::text, CASE WHEN a.is_all_day THEN date_trunc('day', a.start_datetime AT TIME ZONE 'America/Lima') AT TIME ZONE 'America/Lima' ELSE a.start_datetime END AS starts,
     a.end_datetime, a.is_all_day, CASE WHEN a.is_all_day THEN interval '0' ELSE settings.gap END AS gap
   FROM activities a CROSS JOIN settings WHERE a.id IS DISTINCT FROM p_exclude AND a.status NOT IN ('cancelled','completed')
     AND COALESCE(a.invitation->>'status', '') <> 'declined' AND (a.is_all_day OR a.end_datetime IS NOT NULL OR a.type <> 'task')
     AND (a.profile_id = p_profile OR (a.invitation IS NOT NULL AND (a.invitation->>'recipient_id' = p_profile::text OR a.invitation->>'proposed_by' = p_profile::text)) OR (a.invitation IS NULL AND a.is_shared))
 ), periods AS (
   SELECT title, starts - gap AS starts, ends + gap AS ends FROM occurrences
   UNION ALL SELECT title, starts - gap, COALESCE(end_datetime, starts + CASE WHEN is_all_day THEN interval '1 day' ELSE interval '1 hour' END) + gap FROM activity_times
 ) SELECT title, starts, ends FROM periods WHERE starts < ((p_day + 1)::timestamp AT TIME ZONE 'America/Lima') AND ends > (p_day::timestamp AT TIME ZONE 'America/Lima');
$$;

-- Validación estricta de solapamiento en propuestas compartidas
CREATE OR REPLACE FUNCTION public.memoria_assert_shared_plan(a public.activities) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_day date; last_day date; d date; target uuid; finish timestamptz; occupied text; person text;
BEGIN
 IF (NOT a.is_shared AND a.invitation IS NULL) OR a.status IN ('cancelled','completed') OR a.invitation->>'status' = 'declined' OR (a.type = 'task' AND a.end_datetime IS NULL AND NOT a.is_all_day) THEN RETURN; END IF;
 IF a.is_all_day THEN a.start_datetime := date_trunc('day', a.start_datetime AT TIME ZONE 'America/Lima') AT TIME ZONE 'America/Lima'; END IF;
 finish := COALESCE(a.end_datetime, a.start_datetime + CASE WHEN a.is_all_day THEN interval '1 day' ELSE interval '1 hour' END);
 IF finish - a.start_datetime > interval '7 days' THEN RAISE EXCEPTION 'Un plan compartido puede durar hasta 7 días'; END IF;
 first_day := (a.start_datetime AT TIME ZONE 'America/Lima')::date; last_day := ((finish - interval '1 millisecond') AT TIME ZONE 'America/Lima')::date;
 FOR target IN SELECT DISTINCT id FROM user_profiles WHERE (a.invitation IS NULL OR id::text IN (COALESCE(a.invitation->>'proposed_by', a.profile_id::text), a.invitation->>'recipient_id')) LOOP
   d := first_day;
   WHILE d <= last_day LOOP
     SELECT b.title INTO occupied FROM memoria_busy_periods(d, target, a.id) b WHERE b.starts < finish AND b.ends > a.start_datetime LIMIT 1;
     IF occupied IS NOT NULL THEN SELECT name INTO person FROM user_profiles WHERE id = target; RAISE EXCEPTION '% tiene «%» o su traslado en ese horario. Busca otra hora.', person, occupied; END IF;
     d := d + 1;
   END LOOP;
 END LOOP;
END;
$$;

-- Aplicación atómica de transacciones y cambios (Batch sync)
CREATE OR REPLACE FUNCTION public.memoria_apply_batch(batch jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE op jsonb; r jsonb; t text; previous activities; proposed activities; actor uuid := (batch->>'actor')::uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(7261022);
 IF EXISTS (SELECT 1 FROM memoria_batches WHERE id = (batch->>'id')::uuid) THEN RETURN memoria_snapshot(); END IF;
 IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = actor) THEN RAISE EXCEPTION 'Perfil desconocido'; END IF;
 FOR op IN SELECT * FROM jsonb_array_elements(batch->'mutations') LOOP
   t := op->>'table'; r := op->'record';
   IF t = 'activities' THEN
     SELECT * INTO previous FROM activities WHERE id = (r->>'id')::uuid FOR UPDATE;
     proposed := jsonb_populate_record(NULL::activities, r);
     IF previous.id IS NOT NULL AND previous.invitation IS NOT NULL AND previous.invitation->>'status' = 'pending' AND (r->>'status' = 'cancelled' OR r IS NULL) THEN
       IF actor::text NOT IN (previous.profile_id::text, previous.invitation->>'recipient_id', previous.invitation->>'proposed_by') THEN RAISE EXCEPTION 'No puedes descartar esta invitación'; END IF;
     END IF;
     IF op->>'type' IN ('create','update') THEN
       PERFORM memoria_assert_shared_plan(proposed);
     END IF;
   END IF;
   IF op->>'type' = 'delete' THEN
     EXECUTE format('DELETE FROM %I WHERE id = %L', t, (op->>'id')::uuid);
   ELSE
     EXECUTE format('INSERT INTO %I SELECT * FROM json_populate_record(NULL::%I, %L) ON CONFLICT (id) DO UPDATE SET %s',
       t, t, r::text,
       (SELECT string_agg(format('%1$I = EXCLUDED.%1$I', attname), ', ')
        FROM pg_attribute WHERE attrelid = ('public.' || t)::regclass AND attnum > 0 AND NOT attisdropped AND attname <> 'id')
     );
   END IF;
 END LOOP;
 INSERT INTO memoria_batches (id) VALUES ((batch->>'id')::uuid);
 RETURN memoria_snapshot();
END;
$$;

-- Registro de dispositivos para avisos push
CREATE OR REPLACE FUNCTION public.memoria_register_push(device jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev record;
BEGIN
  SELECT * INTO prev FROM memoria_push_devices WHERE id = device->>'id';
  IF prev.id IS NOT NULL AND prev.token_hash <> (device->>'token_hash') THEN
    RAISE EXCEPTION 'La vinculación del dispositivo no coincide.';
  END IF;

  INSERT INTO memoria_push_devices (id, profile_id, endpoint, keys, token_hash, reminder_minutes, updated_at)
  VALUES (
    device->>'id',
    (device->>'profile_id')::uuid,
    device->>'endpoint',
    device->'keys',
    device->>'token_hash',
    COALESCE((device->>'reminder_minutes')::integer, 30),
    COALESCE((device->>'updated_at')::timestamptz, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    profile_id = EXCLUDED.profile_id,
    endpoint = EXCLUDED.endpoint,
    keys = EXCLUDED.keys,
    token_hash = EXCLUDED.token_hash,
    reminder_minutes = EXCLUDED.reminder_minutes,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Despacho en cola de notificaciones
CREATE OR REPLACE FUNCTION public.memoria_claim_push() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed jsonb;
BEGIN
  WITH to_claim AS (
    SELECT id FROM memoria_push_deliveries
    WHERE state = 'pending'
      AND attempts < 5
      AND available_at <= now()
      AND (lease_until IS NULL OR lease_until <= now())
    ORDER BY available_at ASC
    LIMIT 20
    FOR UPDATE SKIP LOCKED
  ), updated AS (
    UPDATE memoria_push_deliveries d
    SET lease_until = now() + interval '2 minutes',
        attempts = d.attempts + 1
    FROM to_claim c
    WHERE d.id = c.id
    RETURNING d.id, d.device_id, d.attempts, d.job
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(u)), '[]'::jsonb) INTO claimed FROM updated;
  RETURN claimed;
END;
$$;

-- 7. PERMISOS PARA SERVICE_ROLE
GRANT EXECUTE ON FUNCTION public.memoria_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION public.memoria_busy_periods(date, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.memoria_assert_shared_plan(public.activities) TO service_role;
GRANT EXECUTE ON FUNCTION public.memoria_apply_batch(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.memoria_register_push(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.memoria_claim_push() TO service_role;
GRANT ALL ON TABLE public.memoria_push_devices TO service_role;
GRANT ALL ON TABLE public.memoria_push_deliveries TO service_role;
GRANT ALL ON TABLE public.memoria_batches TO service_role;

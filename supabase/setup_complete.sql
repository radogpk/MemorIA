-- memorIA: instalación completa de Supabase.

-- Generado con npm run db:setup. No editar este archivo a mano.

-- Usa este instalador O los archivos individuales en el orden documentado.

-- No incluye datos de ejemplo ni elimina registros existentes.

BEGIN;

-- Source: supabase/schema.sql
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

-- Source: supabase/migrations/20261022_reliable_storage.sql
-- Apply after schema.sql. Non-destructive and repeatable.
ALTER TABLE public.recurrent_classes ADD COLUMN IF NOT EXISTS professor text;
ALTER TABLE public.recurrent_classes ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'theory';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS invitation jsonb;
ALTER TABLE public.subjects ALTER COLUMN classroom TYPE varchar(100);
ALTER TABLE public.recurrent_classes ALTER COLUMN classroom TYPE varchar(100);
CREATE TABLE IF NOT EXISTS public.memoria_batches (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.memoria_batches ENABLE ROW LEVEL SECURITY;

INSERT INTO public.user_profiles(id,name,nickname,avatar_color,role) VALUES
('727db856-313b-4c91-91e4-7fac976dfc6d','Gerardo','Principito','#3b82f6','owner'),
('1e12d23b-f0b2-49d4-ae4b-b602226c7d14','Norely','Evebebé','#ec4899','partner')
ON CONFLICT (id) DO NOTHING;

-- Repair legacy ownership without deleting profiles or academic data.
UPDATE public.subjects SET profile_id = '727db856-313b-4c91-91e4-7fac976dfc6d'
WHERE profile_id IN (SELECT id FROM public.user_profiles WHERE name IN ('Luis','Gerardo') AND id <> '727db856-313b-4c91-91e4-7fac976dfc6d');
UPDATE public.subjects SET profile_id = '1e12d23b-f0b2-49d4-ae4b-b602226c7d14'
WHERE profile_id IN (SELECT id FROM public.user_profiles WHERE name IN ('Mi Novia','Evebebé') AND id <> '1e12d23b-f0b2-49d4-ae4b-b602226c7d14');
UPDATE public.activities SET profile_id = '727db856-313b-4c91-91e4-7fac976dfc6d'
WHERE profile_id IN (SELECT id FROM public.user_profiles WHERE name IN ('Luis','Gerardo') AND id <> '727db856-313b-4c91-91e4-7fac976dfc6d');
UPDATE public.activities SET profile_id = '1e12d23b-f0b2-49d4-ae4b-b602226c7d14'
WHERE profile_id IN (SELECT id FROM public.user_profiles WHERE name IN ('Mi Novia','Evebebé') AND id <> '1e12d23b-f0b2-49d4-ae4b-b602226c7d14');
UPDATE public.recurrent_classes c SET profile_id=s.profile_id FROM public.subjects s WHERE c.subject_id=s.id;
UPDATE public.activities a SET profile_id=s.profile_id FROM public.subjects s WHERE a.subject_id=s.id;
UPDATE public.recurrent_classes SET session_type='laboratory' WHERE classroom ~* '\mlab(oratorio)?\M' AND session_type='theory';

CREATE OR REPLACE FUNCTION public.memoria_snapshot() RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'profiles', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM user_profiles p WHERE p.id IN ('727db856-313b-4c91-91e4-7fac976dfc6d','1e12d23b-f0b2-49d4-ae4b-b602226c7d14')), '[]'::jsonb),
    'subjects', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM subjects s), '[]'::jsonb),
    'recurrentClasses', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM recurrent_classes c), '[]'::jsonb),
    'activities', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM activities a), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.memoria_apply_batch(batch jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE op jsonb; r jsonb; t text; previous activities; proposed activities; actor uuid := (batch->>'actor')::uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(7261022);
  IF EXISTS (SELECT 1 FROM memoria_batches WHERE id=(batch->>'id')::uuid) THEN RETURN memoria_snapshot(); END IF;
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id=actor) THEN RAISE EXCEPTION 'Perfil desconocido'; END IF;
  FOR op IN SELECT * FROM jsonb_array_elements(batch->'mutations') LOOP
    t:=op->>'table'; r:=op->'record';
    IF t='activities' THEN
      SELECT * INTO previous FROM activities WHERE id=(r->>'id')::uuid FOR UPDATE;
      proposed := jsonb_populate_record(NULL::activities,r);
      IF previous.invitation IS NOT NULL AND previous.profile_id <> actor THEN
        IF op->>'action'<>'upsert' OR previous.invitation->>'recipient_id'<>actor::text OR previous.invitation->>'status'<>'pending'
          OR r->'invitation'->>'status' NOT IN ('accepted','declined') THEN RAISE EXCEPTION 'Respuesta a invitación inválida'; END IF;
        IF proposed.start_datetime IS DISTINCT FROM previous.start_datetime OR proposed.end_datetime IS DISTINCT FROM previous.end_datetime OR proposed.title IS DISTINCT FROM previous.title OR proposed.description IS DISTINCT FROM previous.description THEN RAISE EXCEPTION 'La invitación cambió; revisa la nueva propuesta'; END IF;
        r:=to_jsonb(previous)||jsonb_build_object('updated_at',now(),'invitation',previous.invitation||jsonb_build_object('status',r->'invitation'->>'status','responded_at',now()));
      ELSIF previous.invitation IS NOT NULL AND r->'invitation' IS NOT NULL AND r->'invitation'<>'null'::jsonb THEN
        IF proposed.start_datetime IS DISTINCT FROM previous.start_datetime OR proposed.end_datetime IS DISTINCT FROM previous.end_datetime OR proposed.title IS DISTINCT FROM previous.title OR proposed.description IS DISTINCT FROM previous.description THEN
          r:=r||jsonb_build_object('invitation',previous.invitation||jsonb_build_object('status','pending','responded_at',NULL));
        ELSE r:=r||jsonb_build_object('invitation',previous.invitation); END IF;
      END IF;
    END IF;
    IF op->>'action'='delete' THEN
      CASE t
        WHEN 'profiles' THEN RAISE EXCEPTION 'No se eliminan perfiles mediante este endpoint';
        WHEN 'subjects' THEN UPDATE activities SET subject_id=NULL WHERE subject_id=(r->>'id')::uuid; DELETE FROM subjects WHERE id=(r->>'id')::uuid;
        WHEN 'recurrentClasses' THEN DELETE FROM recurrent_classes WHERE id=(r->>'id')::uuid;
        WHEN 'activities' THEN DELETE FROM activities WHERE id=(r->>'id')::uuid;
        ELSE RAISE EXCEPTION 'Tabla inválida';
      END CASE;
    ELSE
      CASE t
        WHEN 'profiles' THEN
          INSERT INTO user_profiles SELECT * FROM jsonb_populate_record(NULL::user_profiles,r)
          ON CONFLICT (id) DO UPDATE SET name=excluded.name,nickname=excluded.nickname,avatar_color=excluded.avatar_color;
        WHEN 'subjects' THEN
          INSERT INTO subjects SELECT * FROM jsonb_populate_record(NULL::subjects,r)
          ON CONFLICT (id) DO UPDATE SET profile_id=excluded.profile_id,name=excluded.name,code=excluded.code,color=excluded.color,professor=excluded.professor,classroom=excluded.classroom,is_active=excluded.is_active,updated_at=excluded.updated_at;
        WHEN 'recurrentClasses' THEN
          INSERT INTO recurrent_classes SELECT * FROM jsonb_populate_record(NULL::recurrent_classes,r)
          ON CONFLICT (id) DO UPDATE SET profile_id=excluded.profile_id,subject_id=excluded.subject_id,day_of_week=excluded.day_of_week,start_time=excluded.start_time,end_time=excluded.end_time,classroom=excluded.classroom,professor=excluded.professor,session_type=excluded.session_type;
        WHEN 'activities' THEN
          INSERT INTO activities SELECT * FROM jsonb_populate_record(NULL::activities,r)
          ON CONFLICT (id) DO UPDATE SET profile_id=excluded.profile_id,subject_id=excluded.subject_id,title=excluded.title,description=excluded.description,type=excluded.type,status=excluded.status,start_datetime=excluded.start_datetime,end_datetime=excluded.end_datetime,is_all_day=excluded.is_all_day,priority=excluded.priority,is_shared=excluded.is_shared,invitation=excluded.invitation,metadata=excluded.metadata,updated_at=excluded.updated_at;
        ELSE RAISE EXCEPTION 'Tabla inválida';
      END CASE;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM recurrent_classes c JOIN subjects s ON c.subject_id=s.id WHERE c.profile_id IS DISTINCT FROM s.profile_id)
    OR EXISTS (SELECT 1 FROM activities a JOIN subjects s ON a.subject_id=s.id WHERE a.profile_id IS DISTINCT FROM s.profile_id)
    THEN RAISE EXCEPTION 'El curso y sus registros deben pertenecer al mismo perfil'; END IF;
  INSERT INTO memoria_batches(id) VALUES ((batch->>'id')::uuid);
  RETURN memoria_snapshot();
END;
$$;
REVOKE ALL ON FUNCTION public.memoria_snapshot() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.memoria_apply_batch(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.memoria_snapshot(),public.memoria_apply_batch(jsonb) TO service_role;
-- The browser now talks to the app API. Never expose the service role to the client.
REVOKE ALL ON public.user_profiles,public.subjects,public.recurrent_classes,public.activities,public.memoria_batches FROM anon,authenticated;

-- Source: supabase/migrations/20261023_norely_profile.sql
-- Preserve the same profile identity and all course/activity ownership.
UPDATE public.user_profiles
SET name = 'Norely', nickname = 'Evebebé'
WHERE id = '1e12d23b-f0b2-49d4-ae4b-b602226c7d14';

-- Source: supabase/migrations/20261023_planning_upgrades.sql
-- Apply after 20261022_reliable_storage.sql and 20261023_norely_profile.sql.
-- Adds fields without deleting or replacing existing records.
-- Reapply this file to repair the incompatible memoria_apply_batch function
-- installed by older versions of setup_complete.sql. Pending batches can retry.
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS schedule jsonb;
UPDATE public.user_profiles SET schedule=jsonb_build_object('holiday_policy',CASE WHEN id='727db856-313b-4c91-91e4-7fac976dfc6d' THEN 'skip' ELSE 'attend' END,'holidays','[]'::jsonb,'travel_minutes',0) WHERE schedule IS NULL;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS term jsonb;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS holiday_policy text NOT NULL DEFAULT 'inherit';
ALTER TABLE public.recurrent_classes ADD COLUMN IF NOT EXISTS exceptions jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.memoria_busy_periods(p_day date,p_profile uuid,p_exclude uuid)
RETURNS TABLE(title text,starts timestamptz,ends timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH settings AS (
   SELECT COALESCE(schedule,jsonb_build_object('holiday_policy','attend','holidays','[]'::jsonb,'travel_minutes',0)) AS prefs,
     make_interval(mins=>COALESCE((schedule->>'travel_minutes')::int,0)) AS gap FROM user_profiles WHERE id=p_profile
 ), occurrences AS (
   SELECT s.name::text AS title,(d::date+COALESCE((x.value->>'start_time')::time,c.start_time)) AT TIME ZONE 'America/Lima' AS starts,
     (d::date+COALESCE((x.value->>'end_time')::time,c.end_time)) AT TIME ZONE 'America/Lima' AS ends,settings.gap
   FROM recurrent_classes c JOIN subjects s ON s.id=c.subject_id CROSS JOIN settings
   CROSS JOIN generate_series(p_day-1,p_day+1,interval '1 day') AS d
   LEFT JOIN LATERAL (SELECT value FROM jsonb_array_elements(c.exceptions) WHERE value->>'date'=d::date::text LIMIT 1) x ON true
   WHERE s.profile_id=p_profile AND s.is_active AND c.day_of_week=extract(isodow FROM d)
     AND (s.term IS NULL OR (d::date BETWEEN (s.term->>'start_date')::date AND (s.term->>'end_date')::date))
     AND COALESCE(x.value->>'action','')<>'cancel'
     AND (x.value IS NOT NULL OR COALESCE(NULLIF(s.holiday_policy,'inherit'),settings.prefs->>'holiday_policy')<>'skip'
       OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(settings.prefs->'holidays','[]'::jsonb)) h WHERE h->>'date'=d::date::text))
 ), activity_times AS (
   SELECT a.title::text,CASE WHEN a.is_all_day THEN date_trunc('day',a.start_datetime AT TIME ZONE 'America/Lima') AT TIME ZONE 'America/Lima' ELSE a.start_datetime END AS starts,
     a.end_datetime,a.is_all_day,CASE WHEN a.is_all_day THEN interval '0' ELSE settings.gap END AS gap
   FROM activities a CROSS JOIN settings WHERE a.id IS DISTINCT FROM p_exclude AND a.status NOT IN ('cancelled','completed')
     AND COALESCE(a.invitation->>'status','')<>'declined' AND (a.is_all_day OR a.end_datetime IS NOT NULL OR a.type<>'task')
     AND (a.profile_id=p_profile OR (a.invitation IS NOT NULL AND (a.invitation->>'recipient_id'=p_profile::text OR a.invitation->>'proposed_by'=p_profile::text)) OR (a.invitation IS NULL AND a.is_shared))
 ), periods AS (
   SELECT title,starts-gap AS starts,ends+gap AS ends FROM occurrences
   UNION ALL SELECT title,starts-gap,COALESCE(end_datetime,starts+CASE WHEN is_all_day THEN interval '1 day' ELSE interval '1 hour' END)+gap FROM activity_times
 ) SELECT title,starts,ends FROM periods WHERE starts < ((p_day+1)::timestamp AT TIME ZONE 'America/Lima') AND ends > (p_day::timestamp AT TIME ZONE 'America/Lima');
$$;

CREATE OR REPLACE FUNCTION public.memoria_assert_shared_plan(a public.activities) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE first_day date; last_day date; d date; target uuid; finish timestamptz; occupied text; person text;
BEGIN
 IF (NOT a.is_shared AND a.invitation IS NULL) OR a.status IN ('cancelled','completed') OR a.invitation->>'status'='declined' OR (a.type='task' AND a.end_datetime IS NULL AND NOT a.is_all_day) THEN RETURN; END IF;
 IF a.is_all_day THEN a.start_datetime:=date_trunc('day',a.start_datetime AT TIME ZONE 'America/Lima') AT TIME ZONE 'America/Lima'; END IF;
 finish:=COALESCE(a.end_datetime,a.start_datetime+CASE WHEN a.is_all_day THEN interval '1 day' ELSE interval '1 hour' END);
 IF finish-a.start_datetime>interval '7 days' THEN RAISE EXCEPTION 'Un plan compartido puede durar hasta 7 días'; END IF;
 first_day:=(a.start_datetime AT TIME ZONE 'America/Lima')::date; last_day:=((finish-interval '1 millisecond') AT TIME ZONE 'America/Lima')::date;
 FOR target IN SELECT DISTINCT id FROM user_profiles WHERE (a.invitation IS NULL OR id::text IN (COALESCE(a.invitation->>'proposed_by',a.profile_id::text),a.invitation->>'recipient_id')) LOOP
   d:=first_day;
   WHILE d<=last_day LOOP
     SELECT b.title INTO occupied FROM memoria_busy_periods(d,target,a.id) b WHERE b.starts<finish AND b.ends>a.start_datetime LIMIT 1;
     IF occupied IS NOT NULL THEN SELECT name INTO person FROM user_profiles WHERE id=target; RAISE EXCEPTION '% tiene «%» o su traslado en ese horario. Busca otra hora.',person,occupied; END IF;
     d:=d+1;
   END LOOP;
 END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.memoria_apply_batch(batch jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE op jsonb; r jsonb; t text; previous activities; proposed activities; current_plan activities;
 actor uuid:=(batch->>'actor')::uuid; exists_already boolean; sender text; recipient text; proposal_changed boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(7261022);
 IF EXISTS(SELECT 1 FROM memoria_batches WHERE id=(batch->>'id')::uuid) THEN RETURN memoria_snapshot(); END IF;
 IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=actor) THEN RAISE EXCEPTION 'Perfil desconocido'; END IF;
 IF jsonb_array_length(batch->'mutations') NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Cantidad de cambios inválida'; END IF;
 FOR op IN SELECT * FROM jsonb_array_elements(batch->'mutations') LOOP
   t:=op->>'table'; r:=op->'record';
   CASE t
     WHEN 'profiles' THEN SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id=(r->>'id')::uuid) INTO exists_already;
     WHEN 'subjects' THEN SELECT EXISTS(SELECT 1 FROM subjects WHERE id=(r->>'id')::uuid) INTO exists_already;
     WHEN 'recurrentClasses' THEN SELECT EXISTS(SELECT 1 FROM recurrent_classes WHERE id=(r->>'id')::uuid) INTO exists_already;
     WHEN 'activities' THEN SELECT EXISTS(SELECT 1 FROM activities WHERE id=(r->>'id')::uuid) INTO exists_already;
     ELSE RAISE EXCEPTION 'Tabla inválida';
   END CASE;
   IF COALESCE((op->>'create_only')::boolean,false) AND exists_already THEN RAISE EXCEPTION 'Ese registro ya existe. Actualiza la vista previa del respaldo'; END IF;
   IF batch->>'purpose'='restore' AND (t='profiles' OR NOT COALESCE((op->>'create_only')::boolean,false) OR op->>'action'<>'upsert') THEN RAISE EXCEPTION 'Una restauración solo recupera registros que faltan'; END IF;
   IF t='activities' THEN
     SELECT * INTO previous FROM activities WHERE id=(r->>'id')::uuid FOR UPDATE;
     proposed:=jsonb_populate_record(NULL::activities,r);
     IF op ? 'expected_updated_at' AND (previous.id IS NULL OR previous.updated_at IS DISTINCT FROM (op->>'expected_updated_at')::timestamptz) THEN RAISE EXCEPTION 'La actividad cambió en otro dispositivo. Revisa el cambio'; END IF;
     sender:=COALESCE(previous.invitation->>'proposed_by',previous.profile_id::text);
     proposal_changed:=proposed.start_datetime IS DISTINCT FROM previous.start_datetime OR proposed.end_datetime IS DISTINCT FROM previous.end_datetime OR proposed.title IS DISTINCT FROM previous.title OR proposed.description IS DISTINCT FROM previous.description;
     IF op->>'intent'='counterproposal' THEN
       IF op->>'action'<>'upsert' OR previous.invitation IS NULL OR previous.invitation->>'recipient_id'<>actor::text OR previous.invitation->>'status'<>'pending' OR previous.status IN ('cancelled','completed') THEN RAISE EXCEPTION 'Solo quien debe responder puede proponer otra hora'; END IF;
       IF proposed.start_datetime IS NOT DISTINCT FROM previous.start_datetime AND proposed.end_datetime IS NOT DISTINCT FROM previous.end_datetime THEN RAISE EXCEPTION 'Elige una hora diferente'; END IF;
       r:=to_jsonb(previous)||jsonb_build_object('start_datetime',proposed.start_datetime,'end_datetime',proposed.end_datetime,'updated_at',now(),'invitation',jsonb_build_object('proposed_by',actor,'recipient_id',sender,'status','pending','responded_at',NULL,'previous_start',previous.start_datetime,'previous_end',previous.end_datetime));
     ELSIF previous.invitation IS NOT NULL AND previous.invitation->>'recipient_id'=actor::text AND op->>'action'='upsert' THEN
       IF previous.invitation->>'status'<>'pending' OR previous.status IN ('cancelled','completed') OR r->'invitation'->>'status' NOT IN ('accepted','declined') THEN RAISE EXCEPTION 'Respuesta a invitación inválida'; END IF;
       IF proposal_changed THEN RAISE EXCEPTION 'La invitación cambió; revisa la nueva propuesta'; END IF;
       r:=to_jsonb(previous)||jsonb_build_object('updated_at',now(),'invitation',previous.invitation||jsonb_build_object('status',r->'invitation'->>'status','responded_at',now()));
     ELSIF previous.invitation IS NOT NULL THEN
       IF actor::text<>sender AND NOT (op->>'action'='delete' AND previous.profile_id=actor) THEN RAISE EXCEPTION 'Solo quien propuso el horario puede editarlo'; END IF;
       IF op->>'action'='upsert' THEN
         IF proposed.profile_id IS DISTINCT FROM previous.profile_id THEN RAISE EXCEPTION 'La cita conserva el perfil que la creó'; END IF;
         IF previous.invitation ? 'proposed_by' AND r->'invitation'->>'status' IS DISTINCT FROM previous.invitation->>'status' AND r->'invitation'->>'status'<>'pending' THEN RAISE EXCEPTION 'Solo el destinatario puede responder'; END IF;
         r:=r||jsonb_build_object('invitation',CASE WHEN proposal_changed THEN previous.invitation||jsonb_build_object('status','pending','responded_at',NULL) ELSE previous.invitation END);
       END IF;
     ELSIF proposed.invitation IS NOT NULL AND proposed.invitation->>'status'<>'pending' AND batch->>'purpose' IS DISTINCT FROM 'restore' THEN RAISE EXCEPTION 'Una invitación nueva debe estar pendiente';
     END IF;
   END IF;
   IF op->>'action'='delete' THEN
     CASE t
       WHEN 'profiles' THEN RAISE EXCEPTION 'Los perfiles no se eliminan';
       WHEN 'subjects' THEN UPDATE activities SET subject_id=NULL WHERE subject_id=(r->>'id')::uuid; DELETE FROM subjects WHERE id=(r->>'id')::uuid;
       WHEN 'recurrentClasses' THEN DELETE FROM recurrent_classes WHERE id=(r->>'id')::uuid;
       WHEN 'activities' THEN DELETE FROM activities WHERE id=(r->>'id')::uuid;
     END CASE;
   ELSE
     CASE t
       WHEN 'profiles' THEN
         r:=r||jsonb_build_object('schedule',COALESCE(NULLIF(r->'schedule','null'::jsonb),jsonb_build_object('holiday_policy',CASE WHEN r->>'id'='727db856-313b-4c91-91e4-7fac976dfc6d' THEN 'skip' ELSE 'attend' END,'holidays','[]'::jsonb,'travel_minutes',0)));
         INSERT INTO user_profiles SELECT * FROM jsonb_populate_record(NULL::user_profiles,r) ON CONFLICT(id) DO UPDATE SET name=excluded.name,nickname=excluded.nickname,avatar_color=excluded.avatar_color,schedule=excluded.schedule;
       WHEN 'subjects' THEN
         r:=r||jsonb_build_object('holiday_policy',COALESCE(r->>'holiday_policy','inherit'));
         INSERT INTO subjects SELECT * FROM jsonb_populate_record(NULL::subjects,r) ON CONFLICT(id) DO UPDATE SET profile_id=excluded.profile_id,name=excluded.name,code=excluded.code,color=excluded.color,professor=excluded.professor,classroom=excluded.classroom,is_active=excluded.is_active,updated_at=excluded.updated_at,term=excluded.term,holiday_policy=excluded.holiday_policy;
       WHEN 'recurrentClasses' THEN
         r:=r||jsonb_build_object('session_type',COALESCE(r->>'session_type','theory'),'exceptions',COALESCE(NULLIF(r->'exceptions','null'::jsonb),'[]'::jsonb));
         INSERT INTO recurrent_classes SELECT * FROM jsonb_populate_record(NULL::recurrent_classes,r) ON CONFLICT(id) DO UPDATE SET profile_id=excluded.profile_id,subject_id=excluded.subject_id,day_of_week=excluded.day_of_week,start_time=excluded.start_time,end_time=excluded.end_time,classroom=excluded.classroom,professor=excluded.professor,session_type=excluded.session_type,exceptions=excluded.exceptions;
       WHEN 'activities' THEN
         INSERT INTO activities SELECT * FROM jsonb_populate_record(NULL::activities,r) ON CONFLICT(id) DO UPDATE SET profile_id=excluded.profile_id,subject_id=excluded.subject_id,title=excluded.title,description=excluded.description,type=excluded.type,status=excluded.status,start_datetime=excluded.start_datetime,end_datetime=excluded.end_datetime,is_all_day=excluded.is_all_day,priority=excluded.priority,is_shared=excluded.is_shared,invitation=excluded.invitation,metadata=excluded.metadata,updated_at=excluded.updated_at;
     END CASE;
   END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM recurrent_classes c JOIN subjects s ON c.subject_id=s.id WHERE c.profile_id IS DISTINCT FROM s.profile_id) OR EXISTS(SELECT 1 FROM activities a JOIN subjects s ON a.subject_id=s.id WHERE a.profile_id IS DISTINCT FROM s.profile_id) THEN RAISE EXCEPTION 'El curso y sus registros deben pertenecer al mismo perfil'; END IF;
 FOR op IN SELECT * FROM jsonb_array_elements(batch->'mutations') LOOP
   IF op->>'table'='activities' AND op->>'action'='upsert' THEN
     SELECT * INTO current_plan FROM activities WHERE id=(op->'record'->>'id')::uuid;
     IF current_plan.invitation IS NOT NULL THEN
       sender:=COALESCE(current_plan.invitation->>'proposed_by',current_plan.profile_id::text); recipient:=current_plan.invitation->>'recipient_id';
       IF sender=recipient OR NOT EXISTS(SELECT 1 FROM user_profiles WHERE id::text=sender) OR NOT EXISTS(SELECT 1 FROM user_profiles WHERE id::text=recipient) OR current_plan.profile_id::text NOT IN(sender,recipient) THEN RAISE EXCEPTION 'Participantes de invitación inválidos'; END IF;
     END IF;
     PERFORM memoria_assert_shared_plan(current_plan);
   END IF;
 END LOOP;
 INSERT INTO memoria_batches(id) VALUES((batch->>'id')::uuid);
 RETURN memoria_snapshot();
END;
$$;
REVOKE ALL ON FUNCTION public.memoria_busy_periods(date,uuid,uuid),public.memoria_assert_shared_plan(public.activities),public.memoria_apply_batch(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.memoria_busy_periods(date,uuid,uuid),public.memoria_assert_shared_plan(public.activities),public.memoria_apply_batch(jsonb) TO service_role;

-- Source: supabase/migrations/20261023_push_notifications.sql
-- Push notification devices and delivery queue
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

CREATE INDEX IF NOT EXISTS idx_push_deliveries_pending ON public.memoria_push_deliveries(state, available_at) WHERE state = 'pending';

ALTER TABLE public.memoria_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memoria_push_deliveries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.memoria_register_push(device jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prev record;
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

CREATE OR REPLACE FUNCTION public.memoria_claim_push() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  claimed jsonb;
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

REVOKE ALL ON TABLE public.memoria_push_devices,public.memoria_push_deliveries FROM anon,authenticated;
REVOKE ALL ON FUNCTION public.memoria_register_push(jsonb),public.memoria_claim_push() FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.memoria_push_devices TO service_role;
GRANT ALL ON TABLE public.memoria_push_deliveries TO service_role;
GRANT EXECUTE ON FUNCTION public.memoria_register_push(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.memoria_claim_push() TO service_role;

COMMIT;

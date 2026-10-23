-- Apply after schema.sql. Non-destructive and repeatable.
BEGIN;
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
COMMIT;

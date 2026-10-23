-- Apply after 20261022_reliable_storage.sql and 20261023_norely_profile.sql.
-- Adds fields without deleting or replacing existing records.
BEGIN;
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
         r:=r||jsonb_build_object('exceptions',COALESCE(r->'exceptions','[]'::jsonb));
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
COMMIT;

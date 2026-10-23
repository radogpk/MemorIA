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

GRANT ALL ON TABLE public.memoria_push_devices TO service_role;
GRANT ALL ON TABLE public.memoria_push_deliveries TO service_role;
GRANT EXECUTE ON FUNCTION public.memoria_register_push(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.memoria_claim_push() TO service_role;

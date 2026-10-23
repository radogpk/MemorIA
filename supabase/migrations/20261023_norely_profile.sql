-- Preserve the same profile identity and all course/activity ownership.
UPDATE public.user_profiles
SET name = 'Norely', nickname = 'Evebebé'
WHERE id = '1e12d23b-f0b2-49d4-ae4b-b602226c7d14';

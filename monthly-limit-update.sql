-- Normalize monthly inspection limits to 100.
-- Safe to run multiple times.

BEGIN;

ALTER TABLE public.user_settings
  ALTER COLUMN monthly_inspection_limit SET DEFAULT 100;

UPDATE public.user_settings
SET monthly_inspection_limit = 100,
    updated_at = now()
WHERE monthly_inspection_limit = 1000;

COMMIT;

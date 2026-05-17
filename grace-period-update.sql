-- Grace period expiry function for API keys.

CREATE OR REPLACE FUNCTION public.expire_grace_period_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.api_keys
  SET is_active = false
  WHERE revoked_at IS NOT NULL
    AND grace_expires_at <= now()
    AND is_active = true;
END;
$$;

/*
Enable this as a cron job in Supabase Dashboard:
Database -> Extensions -> pg_cron, then run:
*/

SELECT cron.schedule(
  'expire-grace-keys',
  '*/5 * * * *',
  'SELECT expire_grace_period_keys()'
);

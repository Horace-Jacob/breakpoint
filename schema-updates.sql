-- Breakpoint schema updates: grace-period revocation, usage limits, Slack settings, payload truncation

-- ==============================
-- Modify existing tables
-- ==============================

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_expires_at timestamptz;

ALTER TABLE public.inspection_events
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS payload_truncated boolean NOT NULL DEFAULT false;

-- ==============================
-- New tables
-- ==============================

CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  fail_behavior text NOT NULL DEFAULT 'closed' CHECK (fail_behavior IN ('closed', 'open')),
  slack_webhook_url text,
  slack_webhook_verified boolean NOT NULL DEFAULT false,
  slack_alerts_enabled boolean NOT NULL DEFAULT false,
  slack_verified_at timestamptz,
  monthly_inspection_limit integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month text NOT NULL,
  inspection_count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, month)
);

-- ==============================
-- RLS
-- ==============================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
CREATE POLICY "user_settings_select_own"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
CREATE POLICY "user_settings_insert_own"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;
CREATE POLICY "user_settings_update_own"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_settings_delete_own" ON public.user_settings;
CREATE POLICY "user_settings_delete_own"
  ON public.user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_counters_select_own" ON public.usage_counters;
CREATE POLICY "usage_counters_select_own"
  ON public.usage_counters
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_counters_update_own" ON public.usage_counters;
CREATE POLICY "usage_counters_update_own"
  ON public.usage_counters
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_counters_insert_authenticated" ON public.usage_counters;
CREATE POLICY "usage_counters_insert_authenticated"
  ON public.usage_counters
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ==============================
-- Indexes
-- ==============================

CREATE INDEX IF NOT EXISTS idx_api_keys_grace_expires_at ON public.api_keys(grace_expires_at);
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_month ON public.usage_counters(user_id, month);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- ==============================
-- Function: atomic usage increment + limit check
-- ==============================

CREATE OR REPLACE FUNCTION public.increment_usage_and_check(
  p_user_id uuid,
  p_limit integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text;
  v_count integer;
BEGIN
  v_month := to_char(now(), 'YYYY-MM');

  INSERT INTO public.usage_counters (user_id, month, inspection_count)
  VALUES (p_user_id, v_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET inspection_count = public.usage_counters.inspection_count + 1;

  SELECT inspection_count
  INTO v_count
  FROM public.usage_counters
  WHERE user_id = p_user_id
    AND month = v_month;

  RETURN json_build_object(
    'allowed', v_count <= p_limit,
    'current_count', v_count,
    'limit', p_limit
  );
END;
$$;


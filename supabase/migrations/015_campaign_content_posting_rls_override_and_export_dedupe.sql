-- CMP-BE-1012 / CMP-BE-911 / CMP-BE-RLS
-- Campaign module hardening:
-- 1) Add export request fingerprint for dedupe/idempotency.
-- 2) Enable explicit RLS policies across campaign tables.
-- 3) Add admin override RPC with required reason + audit trail.

ALTER TABLE public.campaign_report_exports
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS campaign_report_exports_fingerprint_idx
  ON public.campaign_report_exports (requested_by_user_id, request_fingerprint, requested_at DESC)
  WHERE request_fingerprint IS NOT NULL;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_content_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_report_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign client access" ON public.campaigns;
CREATE POLICY "campaign client access" ON public.campaigns
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "campaign client access" ON public.campaign_content_items;
CREATE POLICY "campaign client access" ON public.campaign_content_items
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "campaign client access" ON public.campaign_assets;
CREATE POLICY "campaign client access" ON public.campaign_assets
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "campaign client access" ON public.campaign_activity_log;
CREATE POLICY "campaign client access" ON public.campaign_activity_log
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "campaign client access" ON public.campaign_reminders;
CREATE POLICY "campaign client access" ON public.campaign_reminders
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "campaign client access" ON public.campaign_content_metrics;
CREATE POLICY "campaign client access" ON public.campaign_content_metrics
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "deny client access" ON public.campaign_report_exports;
CREATE POLICY "deny client access" ON public.campaign_report_exports
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.campaign_admin_override(
  p_content_id UUID,
  p_actor_user_id TEXT,
  p_action TEXT,
  p_reason TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS public.campaign_content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.campaign_content_items%ROWTYPE;
  v_previous_status TEXT;
  v_reason TEXT := NULLIF(trim(COALESCE(p_reason, '')), '');
  v_action TEXT := NULLIF(lower(trim(COALESCE(p_action, ''))), '');
  v_post_url TEXT := NULLIF(trim(COALESCE(p_payload->>'post_url', '')), '');
  v_posted_at_raw TEXT := NULLIF(trim(COALESCE(p_payload->>'posted_at', '')), '');
  v_posted_at TIMESTAMPTZ;
BEGIN
  IF NOT public.campaign_actor_is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: only admins can run campaign overrides.';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'CMP_VALIDATION_FAILED: override reason is required.';
  END IF;

  IF v_action IS NULL OR v_action NOT IN ('reset-draft', 'force-unclaimed', 'force-posted') THEN
    RAISE EXCEPTION 'CMP_VALIDATION_FAILED: invalid override action.';
  END IF;

  IF v_posted_at_raw IS NOT NULL THEN
    BEGIN
      v_posted_at := v_posted_at_raw::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'CMP_VALIDATION_FAILED: posted_at must be a valid timestamp.';
    END;
  END IF;

  SELECT *
  INTO v_item
  FROM public.campaign_content_items
  WHERE id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CMP_NOT_FOUND: content item does not exist.';
  END IF;

  v_previous_status := v_item.status;

  IF v_action = 'reset-draft' THEN
    UPDATE public.campaign_content_items
    SET status = 'draft',
        posting_owner_id = NULL,
        reviewer_id = NULL,
        scheduled_for = NULL,
        posted_at = NULL,
        archived_at = NULL,
        post_url = NULL
    WHERE id = p_content_id
    RETURNING * INTO v_item;

    UPDATE public.campaign_reminders
    SET status = 'cancelled',
        failure_reason = 'admin-override-reset-draft'
    WHERE content_id = p_content_id
      AND status = 'pending';

  ELSIF v_action = 'force-unclaimed' THEN
    UPDATE public.campaign_content_items
    SET status = 'unclaimed',
        posting_owner_id = NULL,
        scheduled_for = NULL,
        posted_at = NULL,
        archived_at = NULL
    WHERE id = p_content_id
    RETURNING * INTO v_item;

    UPDATE public.campaign_reminders
    SET status = 'cancelled',
        failure_reason = 'admin-override-force-unclaimed'
    WHERE content_id = p_content_id
      AND status = 'pending';

  ELSIF v_action = 'force-posted' THEN
    UPDATE public.campaign_content_items
    SET status = 'posted',
        posted_at = COALESCE(v_posted_at, now()),
        archived_at = now(),
        post_url = COALESCE(v_post_url, post_url)
    WHERE id = p_content_id
    RETURNING * INTO v_item;

    UPDATE public.campaign_reminders
    SET status = 'cancelled',
        failure_reason = 'admin-override-force-posted'
    WHERE content_id = p_content_id
      AND status = 'pending';
  END IF;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-admin-override',
    p_actor_user_id,
    jsonb_build_object(
      'action', v_action,
      'reason', v_reason,
      'previous_status', v_previous_status,
      'next_status', v_item.status,
      'payload', COALESCE(p_payload, '{}'::jsonb)
    )
  );

  RETURN v_item;
END;
$$;

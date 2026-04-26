-- CMP-BE-110 / CMP-BE-210 / CMP-BE-910
-- Campaign Content & Posting module foundation schema stub.
-- This migration is intentionally minimal scaffold-only and should be extended
-- ticket-by-ticket with full constraints, RPC transitions, RLS, and policies.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  offer_definition  TEXT NOT NULL DEFAULT '',
  target_audience   TEXT NOT NULL DEFAULT '',
  primary_cta       TEXT NOT NULL DEFAULT '',
  keywords          TEXT[] NOT NULL DEFAULT '{}',
  start_date        DATE,
  end_date          DATE,
  cadence_rule      JSONB,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  created_by        TEXT NOT NULL REFERENCES public.app_users(user_id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.campaign_content_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  body                TEXT NOT NULL DEFAULT '',
  content_type        TEXT NOT NULL DEFAULT 'other',
  topic               TEXT NOT NULL,
  campaign_id         UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'needs_review', 'unclaimed', 'claimed', 'posted')),
  intended_channel    TEXT,
  attributed_author_id TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL,
  posting_owner_id    TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL,
  reviewer_id         TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL,
  scheduled_for       TIMESTAMPTZ,
  posted_at           TIMESTAMPTZ,
  post_url            TEXT,
  rejection_reason    TEXT,
  created_by          TEXT NOT NULL REFERENCES public.app_users(user_id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.campaign_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id        UUID REFERENCES public.campaign_content_items(id) ON DELETE SET NULL,
  campaign_id       UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  asset_type        TEXT NOT NULL DEFAULT 'external-link',
  url               TEXT,
  file_reference    TEXT,
  title             TEXT NOT NULL DEFAULT '',
  created_by        TEXT NOT NULL REFERENCES public.app_users(user_id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  action_type     TEXT NOT NULL,
  performed_by    TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.campaign_reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      UUID NOT NULL REFERENCES public.campaign_content_items(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  reminder_type   TEXT NOT NULL,
  scheduled_for   TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  failure_reason  TEXT
);

CREATE TABLE IF NOT EXISTS public.campaign_report_exports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by_user_id TEXT NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  format              TEXT NOT NULL,
  filters             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  file_name           TEXT,
  file_payload        TEXT,
  error_message       TEXT,
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.campaign_content_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id          UUID NOT NULL REFERENCES public.campaign_content_items(id) ON DELETE CASCADE,
  captured_by_user_id TEXT NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  impressions         INTEGER,
  reactions           INTEGER,
  comments            INTEGER,
  shares              INTEGER,
  clicks              INTEGER,
  conversion_count    INTEGER,
  engagement_rate     NUMERIC(7, 4),
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (impressions IS NULL OR impressions >= 0),
  CHECK (reactions IS NULL OR reactions >= 0),
  CHECK (comments IS NULL OR comments >= 0),
  CHECK (shares IS NULL OR shares >= 0),
  CHECK (clicks IS NULL OR clicks >= 0),
  CHECK (conversion_count IS NULL OR conversion_count >= 0)
);

CREATE INDEX IF NOT EXISTS campaign_content_status_idx
  ON public.campaign_content_items (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS campaign_content_campaign_status_idx
  ON public.campaign_content_items (campaign_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS campaign_assets_campaign_idx
  ON public.campaign_assets (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_assets_content_idx
  ON public.campaign_assets (content_id, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_content_owner_status_idx
  ON public.campaign_content_items (posting_owner_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS campaign_content_reviewer_status_idx
  ON public.campaign_content_items (reviewer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_content_topic_idx
  ON public.campaign_content_items (topic);

CREATE INDEX IF NOT EXISTS campaign_content_unclaimed_partial_idx
  ON public.campaign_content_items (updated_at DESC)
  WHERE status = 'unclaimed';

CREATE INDEX IF NOT EXISTS campaign_content_claimed_partial_idx
  ON public.campaign_content_items (scheduled_for)
  WHERE status = 'claimed';

CREATE INDEX IF NOT EXISTS campaign_activity_entity_idx
  ON public.campaign_activity_log (entity_type, entity_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS campaign_activity_action_idx
  ON public.campaign_activity_log (action_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS campaign_reminders_status_idx
  ON public.campaign_reminders (status, scheduled_for);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_reminders_idempotency_idx
  ON public.campaign_reminders (content_id, user_id, reminder_type, scheduled_for)
  WHERE status <> 'cancelled';

CREATE INDEX IF NOT EXISTS campaign_report_exports_user_idx
  ON public.campaign_report_exports (requested_by_user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS campaign_metrics_content_idx
  ON public.campaign_content_metrics (content_id, captured_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_content_posted_requires_timestamps_ck'
  ) THEN
    ALTER TABLE public.campaign_content_items
      ADD CONSTRAINT campaign_content_posted_requires_timestamps_ck
      CHECK (
        status <> 'posted'
        OR (posted_at IS NOT NULL AND archived_at IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_content_claimed_requires_owner_schedule_ck'
  ) THEN
    ALTER TABLE public.campaign_content_items
      ADD CONSTRAINT campaign_content_claimed_requires_owner_schedule_ck
      CHECK (
        status <> 'claimed'
        OR (posting_owner_id IS NOT NULL AND scheduled_for IS NOT NULL)
      );
  END IF;
END
$$;

DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS campaign_content_items_updated_at ON public.campaign_content_items;
CREATE TRIGGER campaign_content_items_updated_at
  BEFORE UPDATE ON public.campaign_content_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION public.campaign_actor_can_access(
  p_actor_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users au
    WHERE au.user_id = p_actor_user_id
      AND (au.role = 'admin' OR 'campaigns' = ANY(au.page_permissions))
  );
$$;

CREATE OR REPLACE FUNCTION public.campaign_actor_is_admin(
  p_actor_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users au
    WHERE au.user_id = p_actor_user_id
      AND au.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.campaign_submit_for_review(
  p_content_id UUID,
  p_actor_user_id TEXT
)
RETURNS public.campaign_content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.campaign_content_items%ROWTYPE;
BEGIN
  IF NOT public.campaign_actor_can_access(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: actor is not allowed to manage campaigns.';
  END IF;

  SELECT *
  INTO v_item
  FROM public.campaign_content_items
  WHERE id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CMP_NOT_FOUND: content item does not exist.';
  END IF;

  IF v_item.status <> 'draft' THEN
    RAISE EXCEPTION 'CMP_INVALID_STATE: only draft content can be submitted for review.';
  END IF;

  IF v_item.created_by <> p_actor_user_id AND NOT public.campaign_actor_is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: only creator or admin can submit this content.';
  END IF;

  UPDATE public.campaign_content_items
  SET status = 'needs_review',
      reviewer_id = NULL,
      rejection_reason = NULL
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES ('campaign-content', p_content_id::text, 'content-submitted-review', p_actor_user_id, '{}'::jsonb);

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_approve_content(
  p_content_id UUID,
  p_actor_user_id TEXT
)
RETURNS public.campaign_content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.campaign_content_items%ROWTYPE;
BEGIN
  IF NOT public.campaign_actor_is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: only admins can approve content.';
  END IF;

  SELECT *
  INTO v_item
  FROM public.campaign_content_items
  WHERE id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CMP_NOT_FOUND: content item does not exist.';
  END IF;

  IF v_item.status <> 'needs_review' THEN
    RAISE EXCEPTION 'CMP_INVALID_STATE: only needs_review content can be approved.';
  END IF;

  UPDATE public.campaign_content_items
  SET status = 'unclaimed',
      reviewer_id = p_actor_user_id,
      rejection_reason = NULL
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES ('campaign-content', p_content_id::text, 'content-approved', p_actor_user_id, '{}'::jsonb);

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_reject_content(
  p_content_id UUID,
  p_actor_user_id TEXT,
  p_reason TEXT
)
RETURNS public.campaign_content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.campaign_content_items%ROWTYPE;
  v_reason TEXT := NULLIF(trim(COALESCE(p_reason, '')), '');
BEGIN
  IF NOT public.campaign_actor_is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: only admins can reject content.';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'CMP_VALIDATION_FAILED: rejection reason is required.';
  END IF;

  SELECT *
  INTO v_item
  FROM public.campaign_content_items
  WHERE id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CMP_NOT_FOUND: content item does not exist.';
  END IF;

  IF v_item.status <> 'needs_review' THEN
    RAISE EXCEPTION 'CMP_INVALID_STATE: only needs_review content can be rejected.';
  END IF;

  UPDATE public.campaign_content_items
  SET status = 'draft',
      reviewer_id = p_actor_user_id,
      rejection_reason = v_reason
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-rejected',
    p_actor_user_id,
    jsonb_build_object('reason', v_reason)
  );

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_claim_content(
  p_content_id UUID,
  p_actor_user_id TEXT,
  p_channel TEXT DEFAULT NULL,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS public.campaign_content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.campaign_content_items%ROWTYPE;
  v_channel TEXT := COALESCE(NULLIF(trim(COALESCE(p_channel, '')), ''), 'linkedin');
  v_scheduled_for TIMESTAMPTZ := COALESCE(p_scheduled_for, now());
  v_request_id TEXT := NULLIF(trim(COALESCE(p_request_id, '')), '');
BEGIN
  IF NOT public.campaign_actor_can_access(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: actor is not allowed to manage campaigns.';
  END IF;

  IF v_request_id IS NOT NULL THEN
    PERFORM 1
    FROM public.campaign_activity_log
    WHERE entity_type = 'campaign-content'
      AND entity_id = p_content_id::text
      AND action_type = 'content-claimed'
      AND metadata->>'request_id' = v_request_id
    LIMIT 1;

    IF FOUND THEN
      SELECT *
      INTO v_item
      FROM public.campaign_content_items
      WHERE id = p_content_id;
      IF FOUND THEN
        RETURN v_item;
      END IF;
    END IF;
  END IF;

  SELECT *
  INTO v_item
  FROM public.campaign_content_items
  WHERE id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CMP_NOT_FOUND: content item does not exist.';
  END IF;

  IF v_item.status <> 'unclaimed' THEN
    RAISE EXCEPTION 'CMP_INVALID_STATE: only unclaimed content can be claimed.';
  END IF;

  UPDATE public.campaign_content_items
  SET status = 'claimed',
      posting_owner_id = p_actor_user_id,
      intended_channel = v_channel,
      scheduled_for = v_scheduled_for,
      rejection_reason = NULL
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  INSERT INTO public.campaign_reminders (content_id, user_id, reminder_type, scheduled_for, status)
  VALUES (p_content_id, p_actor_user_id, 'in-app', v_scheduled_for, 'pending')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-claimed',
    p_actor_user_id,
    jsonb_build_object(
      'channel', v_channel,
      'scheduled_for', v_scheduled_for,
      'request_id', v_request_id
    )
  );

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_unclaim_content(
  p_content_id UUID,
  p_actor_user_id TEXT,
  p_reason TEXT
)
RETURNS public.campaign_content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.campaign_content_items%ROWTYPE;
  v_reason TEXT := NULLIF(trim(COALESCE(p_reason, '')), '');
BEGIN
  IF NOT public.campaign_actor_can_access(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: actor is not allowed to manage campaigns.';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'CMP_VALIDATION_FAILED: unclaim reason is required.';
  END IF;

  SELECT *
  INTO v_item
  FROM public.campaign_content_items
  WHERE id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CMP_NOT_FOUND: content item does not exist.';
  END IF;

  IF v_item.status <> 'claimed' THEN
    RAISE EXCEPTION 'CMP_INVALID_STATE: only claimed content can be unclaimed.';
  END IF;

  IF v_item.posting_owner_id <> p_actor_user_id AND NOT public.campaign_actor_is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: only claim owner or admin can unclaim this content.';
  END IF;

  UPDATE public.campaign_content_items
  SET status = 'unclaimed',
      posting_owner_id = NULL,
      scheduled_for = NULL
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  UPDATE public.campaign_reminders
  SET status = 'cancelled',
      failure_reason = 'content-unclaimed'
  WHERE content_id = p_content_id
    AND status = 'pending';

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-unclaimed',
    p_actor_user_id,
    jsonb_build_object('reason', v_reason)
  );

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_update_schedule(
  p_content_id UUID,
  p_actor_user_id TEXT,
  p_scheduled_for TIMESTAMPTZ
)
RETURNS public.campaign_content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.campaign_content_items%ROWTYPE;
BEGIN
  IF NOT public.campaign_actor_can_access(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: actor is not allowed to manage campaigns.';
  END IF;

  IF p_scheduled_for IS NULL THEN
    RAISE EXCEPTION 'CMP_VALIDATION_FAILED: schedule timestamp is required.';
  END IF;

  SELECT *
  INTO v_item
  FROM public.campaign_content_items
  WHERE id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CMP_NOT_FOUND: content item does not exist.';
  END IF;

  IF v_item.status <> 'claimed' THEN
    RAISE EXCEPTION 'CMP_INVALID_STATE: only claimed content can be rescheduled.';
  END IF;

  IF v_item.posting_owner_id <> p_actor_user_id AND NOT public.campaign_actor_is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: only claim owner or admin can reschedule this content.';
  END IF;

  UPDATE public.campaign_content_items
  SET scheduled_for = p_scheduled_for
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  INSERT INTO public.campaign_reminders (content_id, user_id, reminder_type, scheduled_for, status)
  VALUES (p_content_id, COALESCE(v_item.posting_owner_id, p_actor_user_id), 'in-app', p_scheduled_for, 'pending')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-schedule-updated',
    p_actor_user_id,
    jsonb_build_object('scheduled_for', p_scheduled_for)
  );

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_mark_posted(
  p_content_id UUID,
  p_actor_user_id TEXT,
  p_post_url TEXT DEFAULT NULL
)
RETURNS public.campaign_content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.campaign_content_items%ROWTYPE;
  v_post_url TEXT := NULLIF(trim(COALESCE(p_post_url, '')), '');
BEGIN
  IF NOT public.campaign_actor_can_access(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: actor is not allowed to manage campaigns.';
  END IF;

  SELECT *
  INTO v_item
  FROM public.campaign_content_items
  WHERE id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CMP_NOT_FOUND: content item does not exist.';
  END IF;

  IF v_item.status <> 'claimed' THEN
    RAISE EXCEPTION 'CMP_INVALID_STATE: only claimed content can be marked posted.';
  END IF;

  IF v_item.posting_owner_id <> p_actor_user_id AND NOT public.campaign_actor_is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: only claim owner or admin can mark posted.';
  END IF;

  UPDATE public.campaign_content_items
  SET status = 'posted',
      posted_at = now(),
      archived_at = now(),
      post_url = COALESCE(v_post_url, post_url)
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  UPDATE public.campaign_reminders
  SET status = 'cancelled',
      failure_reason = 'content-posted'
  WHERE content_id = p_content_id
    AND status = 'pending';

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-posted',
    p_actor_user_id,
    jsonb_build_object('post_url', COALESCE(v_post_url, v_item.post_url))
  );

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_update_post_url(
  p_content_id UUID,
  p_actor_user_id TEXT,
  p_post_url TEXT
)
RETURNS public.campaign_content_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.campaign_content_items%ROWTYPE;
  v_post_url TEXT := NULLIF(trim(COALESCE(p_post_url, '')), '');
BEGIN
  IF NOT public.campaign_actor_can_access(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: actor is not allowed to manage campaigns.';
  END IF;

  SELECT *
  INTO v_item
  FROM public.campaign_content_items
  WHERE id = p_content_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CMP_NOT_FOUND: content item does not exist.';
  END IF;

  IF v_item.status NOT IN ('claimed', 'posted') THEN
    RAISE EXCEPTION 'CMP_INVALID_STATE: post URL can only be updated for claimed or posted content.';
  END IF;

  IF v_item.posting_owner_id <> p_actor_user_id AND NOT public.campaign_actor_is_admin(p_actor_user_id) THEN
    RAISE EXCEPTION 'CMP_PERMISSION_DENIED: only claim owner or admin can update post URL.';
  END IF;

  UPDATE public.campaign_content_items
  SET post_url = v_post_url
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-post-url-updated',
    p_actor_user_id,
    jsonb_build_object('post_url', v_post_url)
  );

  RETURN v_item;
END;
$$;

CREATE OR REPLACE VIEW public.campaign_dashboard_rollup_v AS
SELECT
  (SELECT COUNT(*) FROM public.campaigns) AS campaigns_total,
  COUNT(*) FILTER (WHERE status = 'needs_review') AS waiting_for_review_count,
  COUNT(*) FILTER (WHERE status = 'unclaimed') AS unclaimed_count,
  COUNT(*) FILTER (WHERE status = 'claimed') AS claimed_count,
  COUNT(*) FILTER (WHERE status = 'posted') AS posted_count,
  COUNT(*) FILTER (
    WHERE status = 'claimed'
      AND scheduled_for IS NOT NULL
      AND scheduled_for < now()
  ) AS missed_count
FROM public.campaign_content_items
WHERE archived_at IS NULL;

CREATE OR REPLACE VIEW public.campaign_report_metrics_v AS
SELECT
  date_trunc('day', COALESCE(posted_at, created_at))::date AS activity_date,
  campaign_id,
  created_by,
  posting_owner_id,
  topic,
  status,
  COUNT(*) AS item_count
FROM public.campaign_content_items
GROUP BY 1, 2, 3, 4, 5, 6;

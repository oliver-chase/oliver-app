-- CMP-BE-1301 / CMP-BE-1302
-- Workflow normalization and durable review metadata (rollout-safe).
--
-- Rollout strategy:
-- 1) Keep legacy `campaign_content_items.status` as compatibility field.
-- 2) Add canonical `lifecycle_status` + durable `review_*` fields.
-- 3) Synchronize legacy/canonical values via trigger during transition window.
-- 4) Backfill existing rows, keep legacy RPC contracts, and enrich activity metadata.
--
-- Rollback strategy:
-- - Drop trigger + helper funcs introduced here.
-- - Keep legacy `status` field as source of truth.
-- - Optionally drop added columns/tables after validating no downstream dependency.

ALTER TABLE public.campaign_content_items
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_submitted_by TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_claimed_by TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_approved_by TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_changes_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_changes_requested_by TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_feedback_summary TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_content_lifecycle_status_ck'
  ) THEN
    ALTER TABLE public.campaign_content_items
      ADD CONSTRAINT campaign_content_lifecycle_status_ck
      CHECK (lifecycle_status IN ('draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'posted', 'blocked', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_content_review_status_ck'
  ) THEN
    ALTER TABLE public.campaign_content_items
      ADD CONSTRAINT campaign_content_review_status_ck
      CHECK (review_status IN ('not_submitted', 'in_review', 'changes_requested', 'approved'));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.campaign_legacy_to_canonical_status(
  p_status TEXT,
  p_archived_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_status = 'draft' THEN
    RETURN 'draft';
  ELSIF p_status = 'needs_review' THEN
    RETURN 'in_review';
  ELSIF p_status = 'unclaimed' THEN
    RETURN 'approved';
  ELSIF p_status = 'claimed' THEN
    RETURN 'scheduled';
  ELSIF p_status = 'posted' THEN
    IF p_archived_at IS NOT NULL THEN
      RETURN 'archived';
    END IF;
    RETURN 'posted';
  END IF;
  RETURN 'draft';
END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_canonical_to_legacy_status(
  p_status TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_status = 'draft' THEN
    RETURN 'draft';
  ELSIF p_status = 'in_review' THEN
    RETURN 'needs_review';
  ELSIF p_status = 'changes_requested' THEN
    RETURN 'draft';
  ELSIF p_status = 'approved' THEN
    RETURN 'unclaimed';
  ELSIF p_status = 'scheduled' THEN
    RETURN 'claimed';
  ELSIF p_status = 'posted' THEN
    RETURN 'posted';
  ELSIF p_status = 'blocked' THEN
    RETURN 'draft';
  ELSIF p_status = 'archived' THEN
    RETURN 'posted';
  END IF;
  RETURN 'draft';
END;
$$;

CREATE OR REPLACE FUNCTION public.campaign_sync_status_models()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lifecycle_status IS NULL AND NEW.status IS NOT NULL THEN
    NEW.lifecycle_status := public.campaign_legacy_to_canonical_status(NEW.status, NEW.archived_at);
  END IF;

  IF NEW.status IS NULL AND NEW.lifecycle_status IS NOT NULL THEN
    NEW.status := public.campaign_canonical_to_legacy_status(NEW.lifecycle_status);
  END IF;

  IF NEW.lifecycle_status IS NOT NULL THEN
    NEW.status := public.campaign_canonical_to_legacy_status(NEW.lifecycle_status);
  ELSE
    NEW.lifecycle_status := public.campaign_legacy_to_canonical_status(NEW.status, NEW.archived_at);
  END IF;

  IF NEW.lifecycle_status = 'changes_requested' THEN
    NEW.review_status := 'changes_requested';
  ELSIF NEW.lifecycle_status = 'in_review' THEN
    NEW.review_status := 'in_review';
  ELSIF NEW.lifecycle_status IN ('approved', 'scheduled', 'posted', 'archived') THEN
    NEW.review_status := 'approved';
  ELSIF NEW.review_status IS NULL THEN
    NEW.review_status := 'not_submitted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_content_items_status_model_sync ON public.campaign_content_items;
CREATE TRIGGER campaign_content_items_status_model_sync
  BEFORE INSERT OR UPDATE ON public.campaign_content_items
  FOR EACH ROW EXECUTE FUNCTION public.campaign_sync_status_models();

UPDATE public.campaign_content_items
SET lifecycle_status = public.campaign_legacy_to_canonical_status(status, archived_at)
WHERE lifecycle_status IS NULL;

UPDATE public.campaign_content_items
SET
  review_status = CASE
    WHEN status = 'needs_review' THEN 'in_review'
    WHEN status = 'draft' AND COALESCE(rejection_reason, '') <> '' THEN 'changes_requested'
    WHEN status IN ('unclaimed', 'claimed', 'posted') THEN 'approved'
    ELSE 'not_submitted'
  END,
  review_submitted_at = CASE
    WHEN status = 'needs_review' AND review_submitted_at IS NULL THEN COALESCE(updated_at, created_at)
    ELSE review_submitted_at
  END,
  review_submitted_by = CASE
    WHEN status = 'needs_review' AND review_submitted_by IS NULL THEN created_by
    ELSE review_submitted_by
  END,
  review_approved_at = CASE
    WHEN status IN ('unclaimed', 'claimed', 'posted') AND review_approved_at IS NULL THEN COALESCE(updated_at, created_at)
    ELSE review_approved_at
  END,
  review_approved_by = CASE
    WHEN status IN ('unclaimed', 'claimed', 'posted') AND review_approved_by IS NULL THEN reviewer_id
    ELSE review_approved_by
  END,
  review_changes_requested_at = CASE
    WHEN status = 'draft' AND COALESCE(rejection_reason, '') <> '' AND review_changes_requested_at IS NULL THEN COALESCE(updated_at, created_at)
    ELSE review_changes_requested_at
  END,
  review_changes_requested_by = CASE
    WHEN status = 'draft' AND COALESCE(rejection_reason, '') <> '' AND review_changes_requested_by IS NULL THEN reviewer_id
    ELSE review_changes_requested_by
  END,
  review_feedback_summary = CASE
    WHEN COALESCE(review_feedback_summary, '') = '' AND COALESCE(rejection_reason, '') <> '' THEN rejection_reason
    ELSE review_feedback_summary
  END;

CREATE INDEX IF NOT EXISTS campaign_content_lifecycle_status_idx
  ON public.campaign_content_items (lifecycle_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS campaign_content_review_status_idx
  ON public.campaign_content_items (review_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.campaign_review_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id    UUID NOT NULL REFERENCES public.campaign_content_items(id) ON DELETE CASCADE,
  comment_type  TEXT NOT NULL DEFAULT 'feedback'
                CHECK (comment_type IN ('feedback', 'note', 'approval', 'change-request', 'system')),
  body          TEXT NOT NULL,
  created_by    TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS campaign_review_comments_content_idx
  ON public.campaign_review_comments (content_id, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_review_comments_unresolved_idx
  ON public.campaign_review_comments (content_id, resolved, created_at DESC)
  WHERE resolved = FALSE;

ALTER TABLE public.campaign_review_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign client access" ON public.campaign_review_comments;
CREATE POLICY "campaign client access" ON public.campaign_review_comments
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

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
  SET
    status = 'needs_review',
    lifecycle_status = 'in_review',
    reviewer_id = NULL,
    rejection_reason = NULL,
    review_status = 'in_review',
    review_submitted_at = now(),
    review_submitted_by = p_actor_user_id,
    review_feedback_summary = NULL
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-submitted-review',
    p_actor_user_id,
    jsonb_build_object(
      'legacy_status', v_item.status,
      'lifecycle_status', v_item.lifecycle_status,
      'review_status', v_item.review_status,
      'submitted_at', v_item.review_submitted_at
    )
  );

  INSERT INTO public.campaign_review_comments (content_id, comment_type, body, created_by)
  VALUES (p_content_id, 'system', 'Submitted for review.', p_actor_user_id);

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
  SET
    status = 'unclaimed',
    lifecycle_status = 'approved',
    reviewer_id = p_actor_user_id,
    rejection_reason = NULL,
    review_status = 'approved',
    review_approved_at = now(),
    review_approved_by = p_actor_user_id,
    review_feedback_summary = NULL
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-approved',
    p_actor_user_id,
    jsonb_build_object(
      'legacy_status', v_item.status,
      'lifecycle_status', v_item.lifecycle_status,
      'review_status', v_item.review_status,
      'approved_at', v_item.review_approved_at
    )
  );

  INSERT INTO public.campaign_review_comments (content_id, comment_type, body, created_by)
  VALUES (p_content_id, 'approval', 'Content approved.', p_actor_user_id);

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
  SET
    status = 'draft',
    lifecycle_status = 'changes_requested',
    reviewer_id = p_actor_user_id,
    rejection_reason = v_reason,
    review_status = 'changes_requested',
    review_changes_requested_at = now(),
    review_changes_requested_by = p_actor_user_id,
    review_feedback_summary = v_reason
  WHERE id = p_content_id
  RETURNING * INTO v_item;

  INSERT INTO public.campaign_activity_log (entity_type, entity_id, action_type, performed_by, metadata)
  VALUES (
    'campaign-content',
    p_content_id::text,
    'content-rejected',
    p_actor_user_id,
    jsonb_build_object(
      'legacy_status', v_item.status,
      'lifecycle_status', v_item.lifecycle_status,
      'review_status', v_item.review_status,
      'feedback_summary', v_reason
    )
  );

  INSERT INTO public.campaign_review_comments (content_id, comment_type, body, created_by)
  VALUES (p_content_id, 'change-request', v_reason, p_actor_user_id);

  RETURN v_item;
END;
$$;

CREATE OR REPLACE VIEW public.campaign_content_items_rollout_v AS
SELECT
  cci.*,
  cci.lifecycle_status AS canonical_status,
  cci.status AS legacy_status,
  COALESCE(cci.review_feedback_summary, cci.rejection_reason) AS review_feedback_summary_compat
FROM public.campaign_content_items cci;

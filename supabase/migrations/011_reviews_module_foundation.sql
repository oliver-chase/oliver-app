-- REV-BE-100: foundational schema for self-led growth and review module.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.review_goals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id     TEXT NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  focus_area        TEXT NOT NULL CHECK (focus_area IN ('legacy', 'craftsmanship-quality', 'client-focus', 'growth-ownership')),
  title             TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  success_metric    TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  progress_percent  INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  target_date       DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_updates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id           UUID NOT NULL REFERENCES public.review_goals(id) ON DELETE CASCADE,
  owner_user_id     TEXT NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  update_type       TEXT NOT NULL DEFAULT 'action' CHECK (update_type IN ('action', 'win', 'lesson', 'feedback', 'evidence')),
  content           TEXT NOT NULL CHECK (char_length(content) > 0),
  evidence_link     TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_quarterly_reflections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id     TEXT NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  cycle_label       TEXT NOT NULL CHECK (char_length(cycle_label) > 0 AND char_length(cycle_label) <= 16),
  reflection        TEXT NOT NULL DEFAULT '',
  blockers          TEXT NOT NULL DEFAULT '',
  support_needed    TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, cycle_label)
);

CREATE TABLE IF NOT EXISTS public.review_annual_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id     TEXT NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  review_year       INTEGER NOT NULL CHECK (review_year >= 2020 AND review_year <= 2100),
  self_summary      TEXT NOT NULL DEFAULT '',
  impact_examples   TEXT NOT NULL DEFAULT '',
  growth_plan       TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, review_year)
);

CREATE INDEX IF NOT EXISTS review_goals_owner_created_idx
  ON public.review_goals (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS review_goals_owner_status_idx
  ON public.review_goals (owner_user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS review_updates_owner_created_idx
  ON public.review_updates (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS review_updates_goal_created_idx
  ON public.review_updates (goal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS review_quarterly_owner_cycle_idx
  ON public.review_quarterly_reflections (owner_user_id, cycle_label DESC);

CREATE INDEX IF NOT EXISTS review_annual_owner_year_idx
  ON public.review_annual_reviews (owner_user_id, review_year DESC);

DROP TRIGGER IF EXISTS review_goals_updated_at ON public.review_goals;
CREATE TRIGGER review_goals_updated_at
  BEFORE UPDATE ON public.review_goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS review_quarterly_reflections_updated_at ON public.review_quarterly_reflections;
CREATE TRIGGER review_quarterly_reflections_updated_at
  BEFORE UPDATE ON public.review_quarterly_reflections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS review_annual_reviews_updated_at ON public.review_annual_reviews;
CREATE TRIGGER review_annual_reviews_updated_at
  BEFORE UPDATE ON public.review_annual_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

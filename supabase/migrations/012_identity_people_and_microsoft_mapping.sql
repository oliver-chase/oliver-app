-- IDN-BE-001: canonical person + Microsoft identity mapping slice.
-- Rollback strategy:
-- 1) deploy application code that no longer reads/writes these tables.
-- 2) drop dependent foreign keys (future slices), then drop tables in reverse order:
--    DROP TABLE IF EXISTS public.person_identities;
--    DROP TABLE IF EXISTS public.people;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.people (
  person_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 200),
  primary_email    TEXT NOT NULL DEFAULT '' CHECK (char_length(primary_email) <= 320),
  profile          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.person_identities (
  identity_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id         UUID NOT NULL REFERENCES public.people(person_id) ON DELETE CASCADE,
  provider          TEXT NOT NULL CHECK (provider IN ('microsoft')),
  tenant_id         TEXT NOT NULL CHECK (char_length(tenant_id) > 0 AND char_length(tenant_id) <= 128),
  subject_key       TEXT NOT NULL CHECK (char_length(subject_key) > 0 AND char_length(subject_key) <= 256),
  subject_key_type  TEXT NOT NULL CHECK (subject_key_type IN ('oid', 'sub')),
  identity_source   TEXT NOT NULL DEFAULT 'unknown',
  mapping_decision  TEXT NOT NULL DEFAULT 'unclassified',
  email_snapshot    TEXT NOT NULL DEFAULT '' CHECK (char_length(email_snapshot) <= 320),
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, tenant_id, subject_key),
  UNIQUE (person_id, provider, tenant_id, subject_key_type)
);

CREATE INDEX IF NOT EXISTS people_primary_email_idx
  ON public.people (primary_email);

CREATE INDEX IF NOT EXISTS person_identities_person_idx
  ON public.person_identities (person_id);

CREATE INDEX IF NOT EXISTS person_identities_microsoft_lookup_idx
  ON public.person_identities (provider, tenant_id, subject_key);

DROP TRIGGER IF EXISTS people_updated_at ON public.people;
CREATE TRIGGER people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS person_identities_updated_at ON public.person_identities;
CREATE TRIGGER person_identities_updated_at
  BEFORE UPDATE ON public.person_identities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny client access" ON public.people;
CREATE POLICY "deny client access" ON public.people
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny client access" ON public.person_identities;
CREATE POLICY "deny client access" ON public.person_identities
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

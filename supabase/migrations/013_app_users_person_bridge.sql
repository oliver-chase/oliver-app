-- IDN-BE-002: bridge app_users to canonical people/person identities.
-- This migration is idempotent and safe to rerun.

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS person_id UUID;

-- Ensure every existing app user has a canonical person profile.
INSERT INTO public.people (full_name, primary_email)
SELECT DISTINCT
  COALESCE(au.name, ''),
  au.email
FROM public.app_users au
WHERE au.email IS NOT NULL
  AND au.email <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.people p
    WHERE p.primary_email = au.email
  );

UPDATE public.app_users au
SET person_id = p.person_id
FROM public.people p
WHERE au.person_id IS NULL
  AND p.primary_email = au.email;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_users_person_id_fkey'
      AND conrelid = 'public.app_users'::regclass
  ) THEN
    ALTER TABLE public.app_users
      ADD CONSTRAINT app_users_person_id_fkey
      FOREIGN KEY (person_id)
      REFERENCES public.people(person_id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS app_users_person_id_idx
  ON public.app_users (person_id);

-- Legacy compatibility backfill:
-- Existing app_users.user_id values predate enforced tenant capture, so we map them
-- to a legacy tenant placeholder and annotate mapping_decision for reconciliation.
INSERT INTO public.person_identities (
  person_id,
  provider,
  tenant_id,
  subject_key,
  subject_key_type,
  identity_source,
  mapping_decision,
  email_snapshot,
  metadata
)
SELECT
  au.person_id,
  'microsoft',
  'legacy-unknown-tenant',
  au.user_id,
  'oid',
  'legacy-app-users-backfill',
  'legacy-user-id-without-tid',
  au.email,
  jsonb_build_object(
    'note', 'Backfilled before enforced Microsoft tid capture.',
    'reconcile_on_next_login', true
  )
FROM public.app_users au
WHERE au.person_id IS NOT NULL
  AND au.user_id IS NOT NULL
  AND au.user_id <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.person_identities pi
    WHERE pi.provider = 'microsoft'
      AND pi.tenant_id = 'legacy-unknown-tenant'
      AND pi.subject_key = au.user_id
  );

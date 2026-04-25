-- setup-app-users.sql
-- Purpose:
-- 1) Ensure owner/admin identities exist in app_users.
-- 2) Force owner/admin invariants (role=admin + full permissions).
--
-- Usage:
-- - Run in Supabase SQL editor (staging and production).
-- - Replace OWNER_EMAIL/OWNER_USER_ID placeholders before execution.

BEGIN;

-- Replace these values before running.
-- OWNER_EMAIL should be the Azure login email for Kiana Micari.
-- OWNER_USER_ID should be the Azure oid/sub claim when known.
WITH owner_seed AS (
  SELECT
    'REPLACE_WITH_OWNER_EMAIL@example.com'::text AS email,
    'REPLACE_WITH_OWNER_USER_ID'::text AS user_id,
    'Kiana Micari'::text AS name
)
INSERT INTO public.app_users (user_id, email, name, role, page_permissions)
SELECT
  seed.user_id,
  lower(seed.email),
  seed.name,
  'admin',
  ARRAY['accounts','hr','sdr','crm','slides']
FROM owner_seed seed
ON CONFLICT (user_id)
DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(NULLIF(EXCLUDED.name, ''), app_users.name),
  role = 'admin',
  page_permissions = ARRAY['accounts','hr','sdr','crm','slides'],
  updated_at = NOW();

-- Reconcile placeholder or legacy rows by email to owner invariants.
UPDATE public.app_users
SET
  role = 'admin',
  page_permissions = ARRAY['accounts','hr','sdr','crm','slides'],
  updated_at = NOW()
WHERE lower(email) = lower('REPLACE_WITH_OWNER_EMAIL@example.com');

COMMIT;

-- Enforce case-insensitive uniqueness for app_users.email
-- Note: run dedupe first if duplicates exist across email casing.

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_unique
  ON public.app_users (lower(email));

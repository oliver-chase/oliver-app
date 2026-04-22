-- Deny client (anon/authenticated) access to app_users. Service role bypasses RLS
-- and is the only path that may read/write this table (via functions/api/users.js).
DROP POLICY IF EXISTS "deny client access" ON public.app_users;
CREATE POLICY "deny client access" ON public.app_users
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

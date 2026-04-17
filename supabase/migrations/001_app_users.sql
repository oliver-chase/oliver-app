-- app_users: maps Azure AD accounts to roles + page permissions
CREATE TABLE IF NOT EXISTS app_users (
  user_id            TEXT PRIMARY KEY,           -- Azure AD oid claim
  email              TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL DEFAULT '',
  role               TEXT NOT NULL DEFAULT 'user'
                       CHECK (role IN ('admin', 'user')),
  page_permissions   TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: grant the first admin manually after deploy
-- UPDATE app_users SET role = 'admin', page_permissions = ARRAY['accounts','hr','sdr','crm']
-- WHERE email = 'your@email.com';

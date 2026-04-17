-- design_tokens: admin-editable CSS custom property overrides
CREATE TABLE IF NOT EXISTS design_tokens (
  token_name   TEXT PRIMARY KEY,   -- e.g. --color-brand-purple
  token_value  TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'other',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER design_tokens_updated_at
  BEFORE UPDATE ON design_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

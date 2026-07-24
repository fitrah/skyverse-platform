BEGIN;
CREATE TABLE IF NOT EXISTS sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions (expires_at);
COMMIT;

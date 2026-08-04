BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='email_verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
    UPDATE users SET email_verified_at = created_at;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS auth_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose varchar(24) NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_tokens_user_purpose ON auth_tokens (user_id,purpose);
CREATE INDEX IF NOT EXISTS auth_tokens_expires_at ON auth_tokens (expires_at);
COMMIT;

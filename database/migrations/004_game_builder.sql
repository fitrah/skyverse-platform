BEGIN;

CREATE TABLE IF NOT EXISTS game_projects (
  id uuid PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug varchar(100) NOT NULL UNIQUE,
  title varchar(120) NOT NULL,
  prompt text NOT NULL,
  template varchar(24) NOT NULL CHECK (template IN ('platformer','shooter','survival')),
  config jsonb NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS game_versions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  version integer NOT NULL,
  prompt text NOT NULL,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES game_projects(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL CHECK (status IN ('queued','completed','failed')),
  prompt text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE games ADD COLUMN IF NOT EXISTS creator_user_id bigint REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES game_projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS game_projects_user_updated ON game_projects (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS generation_jobs_user_created ON generation_jobs (user_id, created_at DESC);

COMMIT;

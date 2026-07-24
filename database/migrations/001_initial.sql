BEGIN;
CREATE TABLE IF NOT EXISTS users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username varchar(24) NOT NULL UNIQUE,
  email varchar(255) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  avatar_id varchar(32) NOT NULL DEFAULT 'maya',
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS games (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug varchar(80) NOT NULL UNIQUE,
  title varchar(120) NOT NULL,
  description text NOT NULL DEFAULT '',
  game_url text NOT NULL,
  thumbnail_url text,
  status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS player_progress (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id bigint NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  level varchar(16) NOT NULL DEFAULT 'easy',
  checkpoint integer NOT NULL DEFAULT 0 CHECK (checkpoint >= 0),
  best_time_ms integer CHECK (best_time_ms > 0),
  wins integer NOT NULL DEFAULT 0 CHECK (wins >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id, level)
);
CREATE INDEX IF NOT EXISTS player_progress_game_leaderboard ON player_progress (game_id, level, best_time_ms) WHERE best_time_ms IS NOT NULL;
INSERT INTO games (slug,title,description,game_url,status) VALUES ('skybound-obby','Skybound Obby','Taklukkan rintangan di atas awan.','/games/skybound-obby/index.html','published') ON CONFLICT (slug) DO NOTHING;
COMMIT;

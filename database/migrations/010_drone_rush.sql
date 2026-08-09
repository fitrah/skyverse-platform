BEGIN;

INSERT INTO games (slug,title,description,game_url,status)
VALUES ('drone-rush','Skyverse Drone Rush','FPS co-op bergaya blocky. Buat room, bertarung bersama pemain atau bot, taklukkan 5 wave dan boss drone!','/games/drone-rush/index.html','published')
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,game_url=EXCLUDED.game_url,status='published';

CREATE TABLE IF NOT EXISTS drone_rush_rooms (
  id uuid PRIMARY KEY,
  code char(6) NOT NULL UNIQUE,
  host_user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','playing','finished')),
  seed integer NOT NULL,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drone_rush_players (
  room_id uuid NOT NULL REFERENCES drone_rush_rooms(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat smallint NOT NULL CHECK (seat BETWEEN 1 AND 4),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  kills integer NOT NULL DEFAULT 0 CHECK (kills >= 0),
  wave smallint NOT NULL DEFAULT 0 CHECK (wave BETWEEN 0 AND 6),
  finished boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id,user_id),
  UNIQUE (room_id,seat)
);

ALTER TABLE game_play_history ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS drone_rush_rooms_updated ON drone_rush_rooms(updated_at DESC);
CREATE INDEX IF NOT EXISTS drone_rush_players_user ON drone_rush_players(user_id,joined_at DESC);

COMMIT;

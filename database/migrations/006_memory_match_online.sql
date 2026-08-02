BEGIN;

INSERT INTO games (slug,title,description,game_url,status)
VALUES ('memory-match-online','Memory Match Online','Temukan 20 pasang kartu bersama teman. Cocokkan kartu, pertahankan giliran, dan raih skor tertinggi!','/games/memory-match-online/index.html','published')
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,game_url=EXCLUDED.game_url,status='published';

CREATE TABLE IF NOT EXISTS memory_rooms (
  id uuid PRIMARY KEY,
  code char(6) NOT NULL UNIQUE,
  host_user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','playing','finished')),
  current_turn_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  pending_first smallint CHECK (pending_first BETWEEN 0 AND 39),
  pending_second smallint CHECK (pending_second BETWEEN 0 AND 39),
  resolve_at timestamptz,
  winner_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_room_players (
  room_id uuid NOT NULL REFERENCES memory_rooms(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat smallint NOT NULL CHECK (seat BETWEEN 1 AND 4),
  score smallint NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 20),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id,user_id),
  UNIQUE (room_id,seat)
);

CREATE TABLE IF NOT EXISTS memory_room_cards (
  room_id uuid NOT NULL REFERENCES memory_rooms(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 39),
  symbol varchar(16) NOT NULL,
  matched_by bigint REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (room_id,position)
);

CREATE INDEX IF NOT EXISTS memory_rooms_updated ON memory_rooms (updated_at DESC);
CREATE INDEX IF NOT EXISTS memory_room_players_user ON memory_room_players (user_id,joined_at DESC);

COMMIT;

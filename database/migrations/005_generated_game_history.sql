BEGIN;

CREATE TABLE IF NOT EXISTS game_play_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id bigint NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  won boolean NOT NULL DEFAULT false,
  time_ms integer NOT NULL CHECK (time_ms > 0),
  played_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_play_history_user_played
  ON game_play_history (user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS game_play_history_game_score
  ON game_play_history (game_id, score DESC);

COMMIT;

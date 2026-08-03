BEGIN;

ALTER TABLE memory_room_players ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now();
ALTER TABLE memory_rooms ADD COLUMN IF NOT EXISTS turn_started_at timestamptz;

UPDATE memory_room_players SET last_seen=joined_at WHERE last_seen IS NULL;
UPDATE memory_rooms SET turn_started_at=updated_at WHERE status='playing' AND turn_started_at IS NULL;

CREATE INDEX IF NOT EXISTS memory_room_players_presence ON memory_room_players (room_id,last_seen DESC);
CREATE INDEX IF NOT EXISTS memory_rooms_status_updated ON memory_rooms (status,updated_at);

COMMIT;

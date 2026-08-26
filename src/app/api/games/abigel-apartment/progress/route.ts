import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPool, query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const result = await query(
    `SELECT pp.level,pp.checkpoint AS photos_found,pp.best_time_ms,pp.wins
     FROM player_progress pp JOIN games g ON g.id=pp.game_id
     WHERE pp.user_id=$1 AND g.slug='abigel-apartment'`,
    [user.id],
  );
  return NextResponse.json({ progress: result.rows[0] ?? null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login agar progres tersimpan." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const photos = Math.max(0, Math.min(4, Math.floor(Number(body.photos) || 0)));
  const ghosts = Math.max(1, Math.min(6, Math.floor(Number(body.ghosts) || 1)));
  const fear = Math.max(0, Math.min(100, Math.floor(Number(body.fear) || 0)));
  const timeMs = Math.max(1, Math.min(3_600_000, Math.floor(Number(body.timeMs) || 1)));
  const won = body.won === true;
  const score = Math.max(0, Math.min(9999, photos * 250 + (won ? 1000 : 0) + fear));

  const game = await query<{ id: string }>(
    "SELECT id::text FROM games WHERE slug='abigel-apartment' AND status='published'",
  );
  if (!game.rows[0]) return NextResponse.json({ error: "Game tidak ditemukan." }, { status: 404 });

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO player_progress (user_id,game_id,level,checkpoint,best_time_ms,wins)
       VALUES ($1,$2,'horror',$3,$4,$5)
       ON CONFLICT (user_id,game_id,level) DO UPDATE SET
         checkpoint=GREATEST(player_progress.checkpoint,EXCLUDED.checkpoint),
         best_time_ms=CASE
           WHEN EXCLUDED.best_time_ms IS NULL THEN player_progress.best_time_ms
           WHEN player_progress.best_time_ms IS NULL THEN EXCLUDED.best_time_ms
           ELSE LEAST(player_progress.best_time_ms,EXCLUDED.best_time_ms)
         END,
         wins=player_progress.wins+EXCLUDED.wins,
         updated_at=now()`,
      [user.id, game.rows[0].id, photos, won ? timeMs : null, won ? 1 : 0],
    );
    await client.query(
      "INSERT INTO game_play_history (user_id,game_id,score,won,time_ms,details) VALUES ($1,$2,$3,$4,$5,$6::jsonb)",
      [user.id, game.rows[0].id, score, won, timeMs, JSON.stringify({ photos, ghosts, fear })],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return NextResponse.json({ ok: true });
}

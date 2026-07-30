import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPool, query } from "@/lib/db";

type GameRow = { id: string; template: string };

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const { slug } = await params;
  const summary = await query(
    `SELECT pp.level,pp.checkpoint AS best_score,pp.best_time_ms,pp.wins
     FROM player_progress pp JOIN games g ON g.id=pp.game_id
     WHERE pp.user_id=$1 AND g.slug=$2 AND g.project_id IS NOT NULL`,
    [user.id, slug],
  );
  const history = await query(
    `SELECT h.score,h.won,h.time_ms,h.played_at
     FROM game_play_history h JOIN games g ON g.id=h.game_id
     WHERE h.user_id=$1 AND g.slug=$2 ORDER BY h.played_at DESC LIMIT 20`,
    [user.id, slug],
  );
  return NextResponse.json({ progress: summary.rows[0] ?? null, history: history.rows });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login agar skor tersimpan." }, { status: 401 });
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const score = Math.max(0, Math.min(9999, Math.floor(Number(body.score) || 0)));
  const timeMs = Math.max(1, Math.min(3_600_000, Math.floor(Number(body.timeMs) || 1)));
  const won = body.won === true;
  const game = await query<GameRow>(
    `SELECT g.id::text,gp.template FROM games g JOIN game_projects gp ON gp.id=g.project_id
     WHERE g.slug=$1 AND g.status='published'`,
    [slug],
  );
  if (!game.rows[0]) return NextResponse.json({ error: "Game tidak ditemukan." }, { status: 404 });

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO player_progress (user_id,game_id,level,checkpoint,best_time_ms,wins)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id,game_id,level) DO UPDATE SET
         checkpoint=GREATEST(player_progress.checkpoint,EXCLUDED.checkpoint),
         best_time_ms=CASE
           WHEN EXCLUDED.best_time_ms IS NULL THEN player_progress.best_time_ms
           WHEN player_progress.best_time_ms IS NULL THEN EXCLUDED.best_time_ms
           ELSE LEAST(player_progress.best_time_ms,EXCLUDED.best_time_ms)
         END,
         wins=player_progress.wins+EXCLUDED.wins,
         updated_at=now()`,
      [user.id, game.rows[0].id, game.rows[0].template, score, won ? timeMs : null, won ? 1 : 0],
    );
    await client.query(
      "INSERT INTO game_play_history (user_id,game_id,score,won,time_ms) VALUES ($1,$2,$3,$4,$5)",
      [user.id, game.rows[0].id, score, won, timeMs],
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

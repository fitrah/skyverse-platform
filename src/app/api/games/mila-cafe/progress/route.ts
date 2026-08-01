import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const result = await query("SELECT pp.level,pp.checkpoint AS best_score,pp.best_time_ms,pp.wins FROM player_progress pp JOIN games g ON g.id=pp.game_id WHERE pp.user_id=$1 AND g.slug='mila-cafe'", [user.id]);
  return NextResponse.json({ progress: result.rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login agar skor tersimpan." }, { status: 401 });
  const body = await request.json();
  const score = Math.max(0, Math.min(10, Number(body.score) || 0));
  const level = ["level-1", "level-2", "level-3"].includes(String(body.level)) ? String(body.level) : "level-1";
  const timeMs = Math.max(1, Number(body.timeMs) || 1);
  const won = body.won === true;
  await query(`INSERT INTO player_progress (user_id,game_id,level,checkpoint,best_time_ms,wins) SELECT $1,id,$2,$3,$4,$5 FROM games WHERE slug='mila-cafe' ON CONFLICT (user_id,game_id,level) DO UPDATE SET checkpoint=GREATEST(player_progress.checkpoint,EXCLUDED.checkpoint),best_time_ms=CASE WHEN EXCLUDED.best_time_ms IS NULL THEN player_progress.best_time_ms WHEN player_progress.best_time_ms IS NULL THEN EXCLUDED.best_time_ms ELSE LEAST(player_progress.best_time_ms,EXCLUDED.best_time_ms) END,wins=player_progress.wins+EXCLUDED.wins,updated_at=now()`, [user.id, level, score, won ? timeMs : null, won ? 1 : 0]);
  return NextResponse.json({ ok: true });
}

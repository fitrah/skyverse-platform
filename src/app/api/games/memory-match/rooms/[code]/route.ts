import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { resolvePending } from "@/lib/memory-match";

type Params = { params: Promise<{ code: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const code = (await params).code.toUpperCase();
  const found = await query<{ id: string }>("SELECT id::text FROM memory_rooms WHERE code=$1", [code]);
  const roomId = found.rows[0]?.id;
  if (!roomId) return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  await resolvePending(roomId);
  const membership = await query("SELECT 1 FROM memory_room_players WHERE room_id=$1 AND user_id=$2", [roomId, user.id]);
  if (!membership.rowCount) return NextResponse.json({ error: "Kamu belum bergabung ke room ini." }, { status: 403 });
  const room = await query<{ status:string;host_user_id:string;current_turn_user_id:string|null;pending_first:number|null;pending_second:number|null;resolve_at:Date|null;winner_user_id:string|null }>(
    "SELECT status,host_user_id::text,current_turn_user_id::text,pending_first,pending_second,resolve_at,winner_user_id::text FROM memory_rooms WHERE id=$1", [roomId],
  );
  const state = room.rows[0];
  const players = await query<{ id:string;username:string;seat:number;score:number }>(
    "SELECT u.id::text,u.username,p.seat,p.score FROM memory_room_players p JOIN users u ON u.id=p.user_id WHERE p.room_id=$1 ORDER BY p.seat", [roomId],
  );
  const cards = await query<{ position:number;symbol:string;matched_by:string|null }>(
    "SELECT position,CASE WHEN matched_by IS NOT NULL OR position=$2 OR position=$3 THEN symbol ELSE '' END AS symbol,matched_by::text FROM memory_room_cards WHERE room_id=$1 ORDER BY position", [roomId,state.pending_first,state.pending_second],
  );
  return NextResponse.json({ room:{ code,status:state.status,hostUserId:state.host_user_id,currentTurnUserId:state.current_turn_user_id,pendingFirst:state.pending_first,pendingSecond:state.pending_second,resolveAt:state.resolve_at,winnerUserId:state.winner_user_id },players:players.rows,cards:cards.rows,me:{ id:user.id,username:user.username } });
}

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const code = (await params).code.toUpperCase();
  const body = await request.json().catch(() => ({}));
  if (body.action !== "join") return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  const room = await query<{ id:string;status:string }>("SELECT id::text,status FROM memory_rooms WHERE code=$1", [code]);
  const state = room.rows[0];
  if (!state) return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  if (state.status !== "waiting") return NextResponse.json({ error: "Permainan sudah dimulai." }, { status: 409 });
  const count = await query<{ count:string }>("SELECT count(*)::text AS count FROM memory_room_players WHERE room_id=$1", [state.id]);
  if (Number(count.rows[0].count) >= 4) return NextResponse.json({ error: "Room sudah penuh." }, { status: 409 });
  await query("INSERT INTO memory_room_players (room_id,user_id,seat) SELECT $1,$2,COALESCE(max(seat),0)+1 FROM memory_room_players WHERE room_id=$1 ON CONFLICT (room_id,user_id) DO NOTHING", [state.id,user.id]);
  return NextResponse.json({ ok:true,code });
}

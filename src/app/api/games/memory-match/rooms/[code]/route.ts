import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { cleanupMemoryRooms, maintainMemoryRoom, TURN_SECONDS } from "@/lib/memory-match";

type Params = { params: Promise<{ code: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  await cleanupMemoryRooms();
  const code = (await params).code.toUpperCase();
  const found = await query<{ id: string }>("SELECT id::text FROM memory_rooms WHERE code=$1", [code]);
  const roomId = found.rows[0]?.id;
  if (!roomId) return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  const membership = await query("SELECT 1 FROM memory_room_players WHERE room_id=$1 AND user_id=$2", [roomId, user.id]);
  if (!membership.rowCount) return NextResponse.json({ error: "Kamu belum bergabung ke room ini." }, { status: 403 });
  await query("UPDATE memory_room_players SET last_seen=now() WHERE room_id=$1 AND user_id=$2", [roomId,user.id]);
  await maintainMemoryRoom(roomId);
  const room = await query<{ status:string;host_user_id:string;current_turn_user_id:string|null;pending_first:number|null;pending_second:number|null;resolve_at:Date|null;winner_user_id:string|null;turn_started_at:Date|null }>(
    "SELECT status,host_user_id::text,current_turn_user_id::text,pending_first,pending_second,resolve_at,winner_user_id::text,turn_started_at FROM memory_rooms WHERE id=$1", [roomId],
  );
  const state = room.rows[0];
  const players = await query<{ id:string;username:string;seat:number;score:number;online:boolean }>(
    "SELECT u.id::text,u.username,p.seat,p.score,p.last_seen > now()-interval '60 seconds' AS online FROM memory_room_players p JOIN users u ON u.id=p.user_id WHERE p.room_id=$1 ORDER BY p.seat", [roomId],
  );
  const cards = await query<{ position:number;symbol:string;matched_by:string|null }>(
    "SELECT position,CASE WHEN matched_by IS NOT NULL OR position=$2 OR position=$3 THEN symbol ELSE '' END AS symbol,matched_by::text FROM memory_room_cards WHERE room_id=$1 ORDER BY position", [roomId,state.pending_first,state.pending_second],
  );
  const turnExpiresAt=state.turn_started_at?new Date(state.turn_started_at.getTime()+TURN_SECONDS*1000):null;
  return NextResponse.json({ room:{ code,status:state.status,hostUserId:state.host_user_id,currentTurnUserId:state.current_turn_user_id,pendingFirst:state.pending_first,pendingSecond:state.pending_second,resolveAt:state.resolve_at,winnerUserId:state.winner_user_id,turnExpiresAt },players:players.rows,cards:cards.rows,me:{ id:user.id,username:user.username },serverNow:new Date() });
}

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const code = (await params).code.toUpperCase();
  const body = await request.json().catch(() => ({}));
  if (!['join','leave'].includes(body.action)) return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  const room = await query<{ id:string;status:string }>("SELECT id::text,status FROM memory_rooms WHERE code=$1", [code]);
  const state = room.rows[0];
  if (!state) return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
  if (body.action === 'leave') {
    await query("UPDATE memory_room_players SET last_seen=now()-interval '61 seconds' WHERE room_id=$1 AND user_id=$2",[state.id,user.id]);
    await maintainMemoryRoom(state.id);
    return NextResponse.json({ok:true});
  }
  if (state.status !== "waiting") return NextResponse.json({ error: "Permainan sudah dimulai." }, { status: 409 });
  const count = await query<{ count:string }>("SELECT count(*)::text AS count FROM memory_room_players WHERE room_id=$1", [state.id]);
  if (Number(count.rows[0].count) >= 4) return NextResponse.json({ error: "Room sudah penuh." }, { status: 409 });
  await query("INSERT INTO memory_room_players (room_id,user_id,seat,last_seen) SELECT $1,$2,COALESCE(max(seat),0)+1,now() FROM memory_room_players WHERE room_id=$1 ON CONFLICT (room_id,user_id) DO UPDATE SET last_seen=now()", [state.id,user.id]);
  return NextResponse.json({ ok:true,code });
}

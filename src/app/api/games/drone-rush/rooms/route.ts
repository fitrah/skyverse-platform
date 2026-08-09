import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPool, query } from "@/lib/db";

const code = () => randomBytes(4).toString("base64url").replace(/[^A-Z0-9]/gi, "").toUpperCase().padEnd(6, "X").slice(0, 6);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login untuk bermain online." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "create");
  if (action === "join") {
    const roomCode = String(body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) return NextResponse.json({ error: "Kode room harus 6 karakter." }, { status: 400 });
    const room = await query<{ id: string; status: string }>("SELECT id::text,status FROM drone_rush_rooms WHERE code=$1", [roomCode]);
    if (!room.rows[0]) return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
    if (room.rows[0].status !== "waiting") return NextResponse.json({ error: "Pertandingan sudah dimulai." }, { status: 409 });
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query<{ count: string }>("SELECT count(*)::text count FROM drone_rush_players WHERE room_id=$1 FOR UPDATE", [room.rows[0].id]);
      if (Number(locked.rows[0].count) >= 4) throw Object.assign(new Error("Room sudah penuh."), { status: 409 });
      await client.query(`INSERT INTO drone_rush_players(room_id,user_id,seat)
        SELECT $1,$2,COALESCE((SELECT min(s) FROM generate_series(1,4) s WHERE NOT EXISTS (SELECT 1 FROM drone_rush_players p WHERE p.room_id=$1 AND p.seat=s)),1)
        ON CONFLICT(room_id,user_id) DO UPDATE SET last_seen=now()`, [room.rows[0].id, user.id]);
      await client.query("UPDATE drone_rush_rooms SET updated_at=now() WHERE id=$1", [room.rows[0].id]);
      await client.query("COMMIT");
      return NextResponse.json({ code: roomCode });
    } catch (error) {
      await client.query("ROLLBACK");
      const e = error as Error & { status?: number };
      return NextResponse.json({ error: e.message }, { status: e.status || 500 });
    } finally { client.release(); }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = code();
    try {
      await query(`WITH room AS (
        INSERT INTO drone_rush_rooms(id,code,host_user_id,seed) VALUES($1,$2,$3,$4) RETURNING id
      ) INSERT INTO drone_rush_players(room_id,user_id,seat) SELECT id,$3,1 FROM room`,
      [randomUUID(), roomCode, user.id, randomInt(1, 2147483647)]);
      return NextResponse.json({ code: roomCode });
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  return NextResponse.json({ error: "Gagal membuat room. Coba lagi." }, { status: 500 });
}

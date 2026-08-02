import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";

export const MEMORY_SYMBOLS = ["🐶","🐱","🐰","🦊","🐼","🐨","🐯","🦁","🐸","🐵","⭐","🌙","☀️","🌈","🚀"];

export function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function shuffledCards() {
  const cards = [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomBytes(2).readUInt16BE(0) % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export async function createMemoryRoom(userId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomUUID(), code = roomCode();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO memory_rooms (id,code,host_user_id) VALUES ($1,$2,$3)", [id, code, userId]);
      await client.query("INSERT INTO memory_room_players (room_id,user_id,seat) VALUES ($1,$2,1)", [id, userId]);
      await client.query("COMMIT");
      return code;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if ((error as { code?: string }).code !== "23505") throw error;
    } finally { client.release(); }
  }
  throw new Error("Gagal membuat kode room.");
}

export async function resolvePending(roomId: string) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const room = await client.query<{ pending_second: number | null; resolve_at: Date | null; current_turn_user_id: string | null }>(
      "SELECT pending_second,resolve_at,current_turn_user_id::text FROM memory_rooms WHERE id=$1 FOR UPDATE", [roomId],
    );
    const state = room.rows[0];
    if (state?.pending_second === null || !state?.resolve_at || state.resolve_at.getTime() > Date.now()) {
      await client.query("COMMIT"); return;
    }
    const players = await client.query<{ user_id: string }>("SELECT user_id::text FROM memory_room_players WHERE room_id=$1 ORDER BY seat", [roomId]);
    const current = players.rows.findIndex((p) => p.user_id === state.current_turn_user_id);
    const next = players.rows[(current + 1 + players.rows.length) % players.rows.length]?.user_id;
    await client.query("UPDATE memory_rooms SET pending_first=NULL,pending_second=NULL,resolve_at=NULL,current_turn_user_id=$2,updated_at=now() WHERE id=$1", [roomId, next]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

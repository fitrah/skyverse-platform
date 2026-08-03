import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";

export const MEMORY_SYMBOLS = ["🐶","🐱","🐰","🦊","🐼","🐨","🐯","🦁","🐸","🐵","⭐","🌙","☀️","🌈","🚀"];
export const TURN_SECONDS = 45;
let lastCleanup = 0;

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

export async function cleanupMemoryRooms(force = false) {
  if (!force && Date.now() - lastCleanup < 60_000) return;
  lastCleanup = Date.now();
  await getPool().query(`DELETE FROM memory_rooms r WHERE
    (r.status='waiting' AND r.created_at < now()-interval '30 minutes' AND NOT EXISTS (SELECT 1 FROM memory_room_players p WHERE p.room_id=r.id AND p.last_seen > now()-interval '30 minutes')) OR
    (r.status='playing' AND NOT EXISTS (SELECT 1 FROM memory_room_players p WHERE p.room_id=r.id AND p.last_seen > now()-interval '2 hours')) OR
    (r.status='finished' AND r.updated_at < now()-interval '24 hours')`);
}

export async function maintainMemoryRoom(roomId: string) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const room = await client.query<{ status:string;pending_second:number|null;resolve_at:Date|null;current_turn_user_id:string|null;turn_started_at:Date|null }>(
      "SELECT status,pending_second,resolve_at,current_turn_user_id::text,turn_started_at FROM memory_rooms WHERE id=$1 FOR UPDATE", [roomId],
    );
    const state = room.rows[0];
    if (!state || state.status !== "playing") { await client.query("COMMIT"); return; }
    const players = await client.query<{ user_id:string;last_seen:Date }>("SELECT user_id::text,last_seen FROM memory_room_players WHERE room_id=$1 ORDER BY seat", [roomId]);
    if (state.pending_second !== null && state.resolve_at && state.resolve_at.getTime() <= Date.now()) {
      const current = players.rows.findIndex((p) => p.user_id === state.current_turn_user_id);
      const next = nextActivePlayer(players.rows, current);
      await client.query("UPDATE memory_rooms SET pending_first=NULL,pending_second=NULL,resolve_at=NULL,current_turn_user_id=$2,turn_started_at=now(),updated_at=now() WHERE id=$1", [roomId, next]);
      await client.query("COMMIT"); return;
    }
    const currentPlayer = players.rows.find((p) => p.user_id === state.current_turn_user_id);
    const timedOut = !state.turn_started_at || state.turn_started_at.getTime() + TURN_SECONDS * 1000 <= Date.now();
    const disconnected = !currentPlayer || currentPlayer.last_seen.getTime() + 60_000 <= Date.now();
    if (state.pending_second === null && (timedOut || disconnected)) {
      const current = players.rows.findIndex((p) => p.user_id === state.current_turn_user_id);
      const next = nextActivePlayer(players.rows, current);
      await client.query("UPDATE memory_rooms SET pending_first=NULL,current_turn_user_id=$2,turn_started_at=now(),updated_at=now() WHERE id=$1", [roomId, next]);
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

function nextActivePlayer(players:{user_id:string;last_seen:Date}[],current:number) {
  const active = players.filter((p) => p.last_seen.getTime() + 60_000 > Date.now());
  for (let step=1;step<=players.length;step++) {
    const candidate=players[(current+step+players.length)%players.length];
    if (active.some((p)=>p.user_id===candidate?.user_id)) return candidate.user_id;
  }
  return players[(current+1+players.length)%players.length]?.user_id ?? null;
}

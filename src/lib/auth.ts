import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query } from "@/lib/db";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "skyverse_session";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer, expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,now() + interval '30 days')", [userId, tokenHash(token)]);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV === "production", path:"/", maxAge:2_592_000 });
}
export async function deleteSession() {
  const store=await cookies(), token=store.get(SESSION_COOKIE)?.value;
  if(token) await query("DELETE FROM sessions WHERE token_hash=$1",[tokenHash(token)]);
  store.delete(SESSION_COOKIE);
}
export type SessionUser={id:string;username:string;email:string;avatar_id:string;coins:number};
export async function getCurrentUser(){
  const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)return null;
  const result=await query<SessionUser>("SELECT u.id::text,u.username,u.email,u.avatar_id,u.coins FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",[tokenHash(token)]);
  return result.rows[0]??null;
}

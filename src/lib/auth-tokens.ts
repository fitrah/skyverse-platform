import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { query } from "@/lib/db";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function issueAuthToken(userId: string, purpose: "verify_email" | "reset_password", minutes: number) {
  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM auth_tokens WHERE user_id=$1 AND purpose=$2 AND (used_at IS NOT NULL OR expires_at<=now())", [userId, purpose]);
  await query("INSERT INTO auth_tokens (user_id,purpose,token_hash,expires_at) VALUES ($1,$2,$3,now()+($4 * interval '1 minute'))", [userId, purpose, hashToken(token), minutes]);
  return token;
}

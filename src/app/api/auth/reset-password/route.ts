import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { hashToken } from "@/lib/auth-tokens";
import { getPool } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json(), token = String(body.token ?? ""), password = String(body.password ?? "");
  if (password.length < 8) return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ id: string; user_id: string }>("SELECT id::text,user_id::text FROM auth_tokens WHERE token_hash=$1 AND purpose='reset_password' AND used_at IS NULL AND expires_at>now() FOR UPDATE", [hashToken(token)]);
    const row = found.rows[0];
    if (!row) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Tautan tidak valid atau sudah kedaluwarsa." }, { status: 400 }); }
    await client.query("UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2", [await hashPassword(password), row.user_id]);
    await client.query("UPDATE auth_tokens SET used_at=now() WHERE id=$1", [row.id]);
    await client.query("DELETE FROM sessions WHERE user_id=$1", [row.user_id]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) { await client.query("ROLLBACK"); console.error(error); return NextResponse.json({ error: "Gagal mengatur ulang password." }, { status: 500 }); }
  finally { client.release(); }
}

import { NextResponse } from "next/server";
import { hashToken } from "@/lib/auth-tokens";
import { getPool } from "@/lib/db";

export async function POST(request: Request) {
  const token = String((await request.json()).token ?? "");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ id: string; user_id: string }>("SELECT id::text,user_id::text FROM auth_tokens WHERE token_hash=$1 AND purpose='verify_email' AND used_at IS NULL AND expires_at>now() FOR UPDATE", [hashToken(token)]);
    const row = found.rows[0];
    if (!row) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Tautan tidak valid atau sudah kedaluwarsa." }, { status: 400 }); }
    await client.query("UPDATE users SET email_verified_at=now(),updated_at=now() WHERE id=$1", [row.user_id]);
    await client.query("UPDATE auth_tokens SET used_at=now() WHERE id=$1", [row.id]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) { await client.query("ROLLBACK"); console.error(error); return NextResponse.json({ error: "Verifikasi gagal." }, { status: 500 }); }
  finally { client.release(); }
}

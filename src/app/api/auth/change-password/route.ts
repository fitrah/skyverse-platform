import { NextResponse } from "next/server";
import { deleteOtherSessions, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesi sudah berakhir. Silakan masuk kembali." }, { status: 401 });

  const body = await request.json();
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 8) return NextResponse.json({ error: "Password baru minimal 8 karakter." }, { status: 400 });
  if (currentPassword === newPassword) return NextResponse.json({ error: "Password baru harus berbeda dari password lama." }, { status: 400 });

  const result = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=$1", [user.id]);
  const stored = result.rows[0]?.password_hash;
  if (!stored || !(await verifyPassword(currentPassword, stored))) {
    return NextResponse.json({ error: "Password lama tidak sesuai." }, { status: 400 });
  }

  await query("UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2", [await hashPassword(newPassword), user.id]);
  await deleteOtherSessions(user.id);
  return NextResponse.json({ ok: true });
}

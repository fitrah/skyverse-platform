import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { issueAuthToken } from "@/lib/auth-tokens";
import { emailLayout, sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  const email = String((await request.json()).email ?? "").trim().toLowerCase();
  const result = await query<{ id: string; username: string }>("SELECT id::text,username FROM users WHERE email=$1 AND email_verified_at IS NULL", [email]);
  const user = result.rows[0];
  if (user) {
    const token = await issueAuthToken(user.id, "verify_email", 1440);
    const href = `${process.env.APP_URL ?? "https://skyverse.proyek.org"}/verify-email?token=${encodeURIComponent(token)}`;
    try { await sendEmail({ to: email, subject: "Verifikasi akun Skyverse", html: emailLayout("Verifikasi emailmu", `Halo ${user.username}, tautan ini berlaku selama 24 jam.`, "VERIFIKASI EMAIL", href) }); }
    catch (error) { console.error("Gagal mengirim ulang verifikasi", error); }
  }
  return NextResponse.json({ ok: true });
}

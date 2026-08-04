import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { issueAuthToken } from "@/lib/auth-tokens";
import { emailLayout, sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  const email = String((await request.json()).email ?? "").trim().toLowerCase();
  const result = await query<{ id: string; username: string }>("SELECT id::text,username FROM users WHERE email=$1", [email]);
  const user = result.rows[0];
  if (user) {
    const token = await issueAuthToken(user.id, "reset_password", 30);
    const href = `${process.env.APP_URL ?? "https://skyverse.proyek.org"}/reset-password?token=${encodeURIComponent(token)}`;
    try { await sendEmail({ to: email, subject: "Reset password Skyverse", html: emailLayout("Atur ulang password", `Halo ${user.username}, tautan ini berlaku selama 30 menit.`, "RESET PASSWORD", href) }); }
    catch (error) { console.error("Gagal mengirim reset password", error); }
  }
  return NextResponse.json({ ok: true });
}

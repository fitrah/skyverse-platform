import "server-only";

type EmailInput = { to: string; subject: string; html: string };

export async function sendEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY belum dikonfigurasi.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Skyverse <noreply@notify.proyek.org>",
      to: [input.to], subject: input.subject, html: input.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend menolak email (${response.status}).`);
}

export function emailLayout(title: string, body: string, action: string, href: string) {
  return `<!doctype html><html><body style="margin:0;background:#eef0fa;font-family:Arial,sans-serif;color:#172440"><div style="max-width:560px;margin:32px auto;background:#fff;padding:36px;border-radius:20px"><div style="font-size:24px;font-weight:800">SKY<span style="color:#6d68df">VERSE</span></div><h1 style="font-size:26px">${title}</h1><p style="line-height:1.7;color:#667085">${body}</p><a href="${href}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#6b67dc;color:#fff;text-decoration:none;font-weight:700">${action}</a><p style="margin-top:28px;font-size:12px;color:#98a2b3">Jika bukan kamu yang meminta, abaikan email ini.</p></div></body></html>`;
}

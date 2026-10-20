import { NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createSession, hashPassword } from "@/lib/auth";
import { query } from "@/lib/db";

const STATE_COOKIE = "skyverse_google_state";

type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
};

type ExistingUser = { id: string; google_sub: string | null };

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/profile";
}

function redirectError(request: Request, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, process.env.APP_URL || "https://skyverse.proyek.org"));
}

function equalState(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

function usernameBase(profile: GoogleProfile, email: string) {
  const source = profile.given_name || profile.name || email.split("@")[0];
  const normalized = source.toLowerCase().replace(/[^a-z0-9_]+/g, "").slice(0, 20);
  return normalized.length >= 3 ? normalized : `player${randomBytes(3).toString("hex")}`;
}

async function uniqueUsername(base: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `${attempt}`;
    const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    const result = await query<{ id: string }>("SELECT id::text FROM users WHERE username=$1", [candidate]);
    if (!result.rows.length) return candidate;
  }
  return `player${randomBytes(5).toString("hex")}`.slice(0, 24);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const cookies = request.headers.get("cookie") || "";
  const stateCookie = cookies.match(new RegExp(`(?:^|; )${STATE_COOKIE}=([^;]*)`))?.[1];
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const [expectedState, encodedNext] = decodeURIComponent(stateCookie || "").split("|");
  const next = safeNext(encodedNext ? decodeURIComponent(encodedNext) : null);

  if (!code || !returnedState || !expectedState || !equalState(expectedState, returnedState)) {
    return redirectError(request, "google_state_invalid");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || "https://skyverse.proyek.org"}/api/auth/google/callback`;
  if (!clientId || !clientSecret) return redirectError(request, "google_not_configured");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return redirectError(request, "google_token_failed");
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) return redirectError(request, "google_token_failed");

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    if (!profileResponse.ok) return redirectError(request, "google_profile_failed");
    const profile = await profileResponse.json() as GoogleProfile;
    const googleSub = String(profile.sub || "");
    const email = String(profile.email || "").trim().toLowerCase();
    if (!googleSub || !email || profile.email_verified !== true) return redirectError(request, "google_email_unverified");

    let user = (await query<ExistingUser>("SELECT id::text,google_sub FROM users WHERE google_sub=$1 OR email=$2 LIMIT 1", [googleSub, email])).rows[0];
    if (user) {
      if (!user.google_sub) await query("UPDATE users SET google_sub=$1,email_verified_at=COALESCE(email_verified_at,now()),updated_at=now() WHERE id=$2", [googleSub, user.id]);
    } else {
      const username = await uniqueUsername(usernameBase(profile, email));
      const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
      const inserted = await query<{ id: string }>(
        "INSERT INTO users (username,email,password_hash,email_verified_at,google_sub) VALUES ($1,$2,$3,now(),$4) RETURNING id::text",
        [username, email, passwordHash, googleSub],
      );
      user = { id: inserted.rows[0].id, google_sub: googleSub };
    }

    await createSession(user.id);
    const response = NextResponse.redirect(new URL(next, request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return redirectError(request, "google_failed");
  }
}

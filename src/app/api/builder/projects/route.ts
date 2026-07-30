import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { getPool, query } from "@/lib/db";
import { generateGameConfig, safeSlug } from "@/lib/game-builder";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const result = await query(
    "SELECT id,slug,title,prompt,template,status,config,updated_at,published_at FROM game_projects WHERE user_id=$1 ORDER BY updated_at DESC",
    [user.id],
  );
  return NextResponse.json({ projects: result.rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").trim();
  if (prompt.length < 12 || prompt.length > 1000) {
    return NextResponse.json({ error: "Prompt harus 12–1000 karakter." }, { status: 400 });
  }
  const recent = await query<{ count: string }>(
    "SELECT count(*)::text AS count FROM generation_jobs WHERE user_id=$1 AND created_at > now() - interval '1 day'",
    [user.id],
  );
  if (Number(recent.rows[0]?.count ?? 0) >= 20) {
    return NextResponse.json({ error: "Batas 20 generasi per hari sudah tercapai." }, { status: 429 });
  }
  const config = generateGameConfig(prompt);
  const id = randomUUID(), jobId = randomUUID(), slug = safeSlug(config.title);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO game_projects (id,user_id,slug,title,prompt,template,config)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [id, user.id, slug, config.title, prompt, config.template, JSON.stringify(config)],
    );
    await client.query(
      "INSERT INTO game_versions (project_id,version,prompt,config) VALUES ($1,1,$2,$3::jsonb)",
      [id, prompt, JSON.stringify(config)],
    );
    await client.query(
      `INSERT INTO generation_jobs (id,project_id,user_id,status,prompt,completed_at)
       VALUES ($1,$2,$3,'completed',$4,now())`,
      [jobId, id, user.id, prompt],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return NextResponse.json({ project: { id, slug, ...config, status: "draft" } }, { status: 201 });
}

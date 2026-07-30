import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateGameConfig, type GameConfig } from "@/lib/game-builder";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").trim();
  if (prompt.length < 12 || prompt.length > 1000) {
    return NextResponse.json({ error: "Prompt revisi harus 12–1000 karakter." }, { status: 400 });
  }
  const owned = await query<{ id: string; prompt: string; config: GameConfig }>("SELECT id,prompt,config FROM game_projects WHERE id=$1 AND user_id=$2", [id, user.id]);
  if (!owned.rows[0]) return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
  const mergedPrompt = `${owned.rows[0].prompt}. Revisi: ${prompt}`.slice(0, 1000);
  const config = generateGameConfig(mergedPrompt);
  config.title = owned.rows[0].config.title;
  const version = await query<{ next: number }>("SELECT COALESCE(max(version),0)+1 AS next FROM game_versions WHERE project_id=$1", [id]);
  await query(
    `UPDATE game_projects SET title=$1,prompt=$2,template=$3,config=$4::jsonb,status='draft',updated_at=now() WHERE id=$5`,
    [config.title, mergedPrompt, config.template, JSON.stringify(config), id],
  );
  await query(
    "INSERT INTO game_versions (project_id,version,prompt,config) VALUES ($1,$2,$3,$4::jsonb)",
    [id, version.rows[0].next, mergedPrompt, JSON.stringify(config)],
  );
  return NextResponse.json({ project: { id, ...config, status: "draft" } });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

type Project = { id: string; slug: string; title: string; prompt: string };

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login." }, { status: 401 });
  const { id } = await params;
  const result = await query<Project>(
    "SELECT id,slug,title,prompt FROM game_projects WHERE id=$1 AND user_id=$2",
    [id, user.id],
  );
  const project = result.rows[0];
  if (!project) return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
  const url = `/play/${project.slug}`;
  await query(
    `INSERT INTO games (slug,title,description,game_url,status,creator_user_id,project_id)
     VALUES ($1,$2,$3,$4,'published',$5,$6)
     ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,
       game_url=EXCLUDED.game_url,status='published',creator_user_id=EXCLUDED.creator_user_id,project_id=EXCLUDED.project_id`,
    [project.slug, project.title, project.prompt.slice(0, 240), url, user.id, id],
  );
  await query("UPDATE game_projects SET status='published',published_at=now(),updated_at=now() WHERE id=$1", [id]);
  return NextResponse.json({ ok: true, url });
}

import { notFound } from "next/navigation";
import GeneratedGame from "@/components/GeneratedGame";
import { query } from "@/lib/db";
import type { GameConfig } from "@/lib/game-builder";
import { getCurrentUser } from "@/lib/auth";
import "./play.css";

export default async function PlayGeneratedGame({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const result = await query<{ config: GameConfig; status: string; user_id: string }>(
    "SELECT config,status,user_id::text FROM game_projects WHERE slug=$1",
    [slug],
  );
  const project = result.rows[0];
  if (!project) notFound();
  if (project.status !== "published") {
    const user = await getCurrentUser();
    if (!user || user.id !== project.user_id) notFound();
  }
  return <GeneratedGame config={project.config} slug={slug} trackProgress={preview !== "1"} />;
}

import { redirect } from "next/navigation";
import GameBuilder from "@/components/GameBuilder";
import { getCurrentUser } from "@/lib/auth";
import "./builder.css";

export default async function CreateGamePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/create");
  return <GameBuilder />;
}

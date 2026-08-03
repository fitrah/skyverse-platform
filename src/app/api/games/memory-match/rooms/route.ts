import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cleanupMemoryRooms, createMemoryRoom } from "@/lib/memory-match";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Harus login untuk membuat room." }, { status: 401 });
  await cleanupMemoryRooms();
  const code = await createMemoryRoom(user.id);
  return NextResponse.json({ code });
}

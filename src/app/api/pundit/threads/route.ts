import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensurePunditThread, listPunditThreads } from "@/lib/pundit-chat-store";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threads = await listPunditThreads(userId);
  return NextResponse.json({ threads });
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thread = await ensurePunditThread(userId);
  return NextResponse.json({ id: thread.id });
}

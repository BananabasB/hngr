import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  deletePunditThread,
  getPunditThread,
  updatePunditThread,
} from "@/lib/pundit-chat-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const thread = await getPunditThread(userId, id);
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(thread);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const patch = (await req.json()) as {
    title?: string;
    status?: "regular" | "archived";
  };

  await updatePunditThread(userId, id, patch);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deletePunditThread(userId, id);
  return new NextResponse(null, { status: 204 });
}

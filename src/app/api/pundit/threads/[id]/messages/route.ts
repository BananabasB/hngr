import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  appendPunditMessage,
  listPunditMessages,
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
  const messages = await listPunditMessages(userId, id);
  if (!messages) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ messages });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    id: string;
    parent_id: string | null;
    format: string;
    content: Record<string, unknown>;
  };

  const saved = await appendPunditMessage({
    userId,
    threadId: id,
    id: body.id,
    parentId: body.parent_id,
    format: body.format,
    content: body.content,
  });

  if (!saved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

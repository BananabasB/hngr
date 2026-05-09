import "server-only";

import { generateId } from "ai";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, chatThreads } from "@/db/schema";

export async function listPunditThreads(userId: string) {
  return db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.userId, userId))
    .orderBy(desc(chatThreads.updatedAt));
}

export async function getPunditThread(userId: string, threadId: string) {
  const [thread] = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
    .limit(1);

  return thread ?? null;
}

export async function ensurePunditThread(userId: string) {
  const [existing] = await db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.userId, userId))
    .limit(1);

  if (existing) return existing;

  const id = generateId();
  const [thread] = await db
    .insert(chatThreads)
    .values({
      id,
      userId,
    })
    .returning();

  return thread;
}

export async function updatePunditThread(
  userId: string,
  threadId: string,
  patch: {
    title?: string | null;
    status?: "regular" | "archived";
  },
) {
  await db
    .update(chatThreads)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)));
}

export async function deletePunditThread(userId: string, threadId: string) {
  await db
    .delete(chatThreads)
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)));
}

export async function listPunditMessages(userId: string, threadId: string) {
  const thread = await getPunditThread(userId, threadId);
  if (!thread) return null;

  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt));
}

export async function appendPunditMessage(params: {
  userId: string;
  threadId: string;
  id: string;
  parentId: string | null;
  format: string;
  content: Record<string, unknown>;
}) {
  const thread = await getPunditThread(params.userId, params.threadId);
  if (!thread) return null;

  await db.insert(chatMessages).values({
    id: params.id,
    threadId: params.threadId,
    parentId: params.parentId,
    format: params.format,
    content: params.content,
  });

  return true;
}

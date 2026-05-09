import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { isHngrPlusEnabled } from '@/lib/plus';

export type DbUser = InferSelectModel<typeof users>;

export async function getRequestUserId(request?: Request): Promise<string | null> {
  const session = await auth();
  if (session.userId) {
    return session.userId;
  }

  const header = request?.headers.get('authorization') ?? null;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.replace('Bearer ', '').trim() || null;
}

export async function getDbUserById(userId: string): Promise<DbUser | null> {
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? null;
}

export function isPlusActive(user: Pick<DbUser, 'isPlus' | 'plusExpiresAt'> | null): boolean {
  if (!isHngrPlusEnabled()) return true;
  if (!user?.isPlus) return false;
  if (!user.plusExpiresAt) return true;
  return new Date(user.plusExpiresAt) > new Date();
}

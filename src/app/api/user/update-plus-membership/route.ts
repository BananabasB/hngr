import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getRequestUserId } from '@/lib/drizzle/server';
import { serializeUser } from '@/lib/drizzle/serializers';

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: requestedUserId, isPlus, plusExpiresAt } = await request.json();

    if (!requestedUserId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (typeof isPlus !== 'boolean') {
      return NextResponse.json({ error: 'isPlus must be a boolean' }, { status: 400 });
    }

    if (requestedUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await db
      .update(users)
      .set({
        isPlus,
        plusExpiresAt: plusExpiresAt ? new Date(plusExpiresAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, requestedUserId))
      .returning();

    return NextResponse.json({ success: true, user: serializeUser(updated[0]) });
  } catch (error) {
    console.error('Unexpected error in update-plus-membership API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

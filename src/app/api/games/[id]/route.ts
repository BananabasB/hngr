import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { games } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getRequestUserId } from '@/lib/drizzle/server';
import { serializeGame } from '@/lib/drizzle/serializers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { tribute_data, name, is_public } = body;
    const existing = await db.select().from(games).where(and(eq(games.id, id), eq(games.ownerId, userId))).limit(1);
    if (!existing[0]) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (tribute_data !== undefined) updateData.tributeData = tribute_data;
    if (name !== undefined) updateData.name = name.trim();
    if (is_public !== undefined) updateData.isPublic = is_public;

    const updated = await db
      .update(games)
      .set(updateData)
      .where(and(eq(games.id, id), eq(games.ownerId, userId)))
      .returning();

    return NextResponse.json(serializeGame(updated[0]));
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}

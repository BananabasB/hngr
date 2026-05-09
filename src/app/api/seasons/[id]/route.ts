import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { games, seasons } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getRequestUserId } from '@/lib/drizzle/server';
import { serializeSeason } from '@/lib/drizzle/serializers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const season = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    const record = season[0];
    if (!record) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    return NextResponse.json(serializeSeason(record));
  } catch (error) {
    console.error('Error fetching season:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season' },
      { status: 500 }
    );
  }
}

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
    const { name, description, status, current_game_id } = body;

    const season = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    const record = season[0];
    if (!record) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }
    if (record.ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (current_game_id !== undefined) updateData.currentGameId = current_game_id || null;
    updateData.updatedAt = new Date();

    const result = await db.transaction(async (tx) => {
      if (current_game_id !== undefined) {
        await tx
          .update(games)
          .set({ isCurrent: false })
          .where(eq(games.seasonId, id));

        if (current_game_id) {
          const currentGame = await tx
            .select()
            .from(games)
            .where(and(eq(games.id, current_game_id), eq(games.seasonId, id), eq(games.ownerId, userId)))
            .limit(1);

          if (!currentGame[0]) {
            throw new Error('Current game not found for this season');
          }

          await tx
            .update(games)
            .set({ isCurrent: true })
            .where(eq(games.id, current_game_id));
        }
      }

      const updated = await tx
        .update(seasons)
        .set(updateData)
        .where(eq(seasons.id, id))
        .returning();

      return serializeSeason(updated[0]);
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating season:', error);
    return NextResponse.json(
      { error: 'Failed to update season' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const season = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    if (!season[0]) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }
    if (season[0].ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(seasons).where(eq(seasons.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting season:', error);
    return NextResponse.json(
      { error: 'Failed to delete season' },
      { status: 500 }
    );
  }
}

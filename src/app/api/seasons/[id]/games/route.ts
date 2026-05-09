import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { games, seasons } from '@/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { getRequestUserId } from '@/lib/drizzle/server';
import { serializeGame } from '@/lib/drizzle/serializers';

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
    if (!season[0]) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }
    if (season[0].ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const seasonGames = await db
      .select()
      .from(games)
      .where(eq(games.seasonId, id))
      .orderBy(asc(games.createdAt));

    return NextResponse.json(seasonGames.map(serializeGame));
  } catch (error) {
    console.error('Error fetching season games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season games' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { name, tribute_data, game_number, is_public } = body;

    if (!name?.trim() || !tribute_data) {
      return NextResponse.json(
        { error: 'Game name and tribute data are required' },
        { status: 400 }
      );
    }

    const season = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
    if (!season[0]) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }
    if (season[0].ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingGames = await db
      .select({ gameNumber: games.gameNumber })
      .from(games)
      .where(eq(games.seasonId, id))
      .orderBy(desc(games.gameNumber))
      .limit(1);

    const nextGameNumber = game_number || (existingGames[0]?.gameNumber ?? 0) + 1;

    const created = await db
      .insert(games)
      .values({
        name: name.trim(),
        seasonId: id,
        ownerId: userId,
        tributeData: tribute_data,
        gameNumber: nextGameNumber,
        isCurrent: false,
        isPublic: is_public || false,
      })
      .returning();

    return NextResponse.json(serializeGame(created[0]));
  } catch (error) {
    console.error('Error creating season game:', error);
    return NextResponse.json(
      { error: 'Failed to create season game' },
      { status: 500 }
    );
  }
}

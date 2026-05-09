import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { games, seasons } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getRequestUserId } from '@/lib/drizzle/server';
import { serializeSeason } from '@/lib/drizzle/serializers';

export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userSeasons = await db
      .select()
      .from(seasons)
      .where(eq(seasons.ownerId, userId))
      .orderBy(desc(seasons.createdAt));

    const seasonsWithCounts = await Promise.all(
      userSeasons.map(async (season: any) => {
        const seasonGames = await db
          .select({ id: games.id })
          .from(games)
          .where(eq(games.seasonId, season.id));

        return {
          ...serializeSeason(season),
          game_count: seasonGames.length,
          has_current_game: !!season.currentGameId,
        };
      })
    );

    return NextResponse.json(seasonsWithCounts);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seasons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Season name is required' },
        { status: 400 }
      );
    }

    const inserted = await db
      .insert(seasons)
      .values({
        ownerId: userId,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .returning();

    const season = inserted[0];
    return NextResponse.json(serializeSeason(season));
  } catch (error) {
    console.error('Error creating season:', error);
    return NextResponse.json(
      { error: 'Failed to create season', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

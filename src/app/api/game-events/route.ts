import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { gameEvents, games } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { serializeGameEvent } from '@/lib/drizzle/serializers';
import { getRequestUserId } from '@/lib/drizzle/server';
import type { CreateGameEventRequest } from '@/lib/supabase/game-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('game_id');
    const eventType = searchParams.get('event_type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const filters: any[] = [];
    if (gameId) {
      filters.push(eq(gameEvents.gameId, gameId));
    }

    if (eventType) {
      filters.push(eq(gameEvents.eventType, eventType as any));
    }

    const query = filters.length
      ? db
          .select()
          .from(gameEvents)
          .where(and(...filters))
          .orderBy(desc(gameEvents.timestamp))
          .limit(limit)
      : db
          .select()
          .from(gameEvents)
          .orderBy(desc(gameEvents.timestamp))
          .limit(limit);

    const data = await query;
    return NextResponse.json({ data: data.map(serializeGameEvent) });
  } catch (error: any) {
    console.error('Error fetching game events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateGameEventRequest = await request.json();
    const game = await db.select().from(games).where(eq(games.id, body.game_id)).limit(1);
    if (!game[0]) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (game[0].ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const created = await db
      .insert(gameEvents)
      .values({
        gameId: body.game_id,
        eventType: body.event_type,
        description: body.description,
        participantIds: body.participant_ids || [],
        districtIds: body.district_ids || [],
        eventData: body.event_data || {},
        severity: body.severity || 'normal',
      })
      .returning();

    return NextResponse.json({ data: serializeGameEvent(created[0]) });
  } catch (error: any) {
    console.error('Error creating game event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

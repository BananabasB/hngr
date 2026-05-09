import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customEvents } from '@/db/schema';
import { getDbUserById, getRequestUserId, isPlusActive } from '@/lib/drizzle/server';
import { serializeCustomEvent } from '@/lib/drizzle/serializers';
import type { CreateCustomEventRequest } from '@/lib/supabase/types';
import { isHngrPlusEnabled } from '@/lib/plus';

async function requirePlusMembership(userId: string) {
  const user = await getDbUserById(userId);
  return isPlusActive(user);
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    if (isHngrPlusEnabled() && !(await requirePlusMembership(userId))) {
      return NextResponse.json({ error: 'hngr+ required' }, { status: 402 });
    }

    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('user_id');
    const publicParam = searchParams.get('public');
    const isPublicFilter = publicParam === null ? null : publicParam === 'true';

    const events = await db.query.customEvents.findMany({
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        attendees: {
          columns: {
            id: true,
            userId: true,
            joinedAt: true,
          },
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isPlus: true,
              },
            },
          },
        },
      },
      orderBy: (event: any, { asc }: any) => [asc(event.eventDate)],
    });

    const filtered = events.filter((event: any) => {
      if (creatorId && event.creatorId !== creatorId) return false;
      if (isPublicFilter !== null && event.isPublic !== isPublicFilter) return false;
      return true;
    });

    return NextResponse.json({
      data: filtered.map(serializeCustomEvent),
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    if (isHngrPlusEnabled() && !(await requirePlusMembership(userId))) {
      return NextResponse.json({ error: 'hngr+ required' }, { status: 402 });
    }

    const eventData: CreateCustomEventRequest = await request.json();
    if (!eventData.title?.trim()) {
      return NextResponse.json({ error: 'Event title is required' }, { status: 400 });
    }

    const created = await db
      .insert(customEvents)
      .values({
        creatorId: userId,
        title: eventData.title.trim(),
        description: eventData.description?.trim() || null,
        eventDate: new Date(eventData.event_date),
        location: eventData.location?.trim() || null,
        maxAttendees: eventData.max_attendees ?? null,
        isPublic: eventData.is_public ?? false,
      })
      .returning();

    return NextResponse.json({ data: serializeCustomEvent(created[0]) });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}

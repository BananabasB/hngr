import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customEvents, eventAttendees } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getDbUserById, getRequestUserId, isPlusActive } from '@/lib/drizzle/server';
import { serializeEventAttendee } from '@/lib/drizzle/serializers';
import { isHngrPlusEnabled } from '@/lib/plus';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const event = await db.query.customEvents.findFirst({
      where: (event: any, { eq }: any) => eq(event.id, eventId),
      with: {
        attendees: {
          columns: { id: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!event.isPublic) {
      const user = await getDbUserById(userId);
      if (isHngrPlusEnabled() && !isPlusActive(user)) {
        return NextResponse.json(
          { error: 'hngr+ membership required to join private events' },
          { status: 403 }
        );
      }
    }

    if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
      return NextResponse.json(
        { error: 'Event is full' },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
      .limit(1);

    if (existing[0]) {
      return NextResponse.json(
        { error: 'Already joined this event' },
        { status: 400 }
      );
    }

    const created = await db
      .insert(eventAttendees)
      .values({
        eventId,
        userId,
      })
      .returning();

    return NextResponse.json({ data: serializeEventAttendee(created[0]) });
  } catch (error: any) {
    console.error('Error joining event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to join event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    await db
      .delete(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error leaving event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to leave event' },
      { status: 500 }
    );
  }
}

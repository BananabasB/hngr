import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDbUserById, getRequestUserId, isPlusActive } from '@/lib/drizzle/server';
import { serializeCustomEvent } from '@/lib/drizzle/serializers';
import { isHngrPlusEnabled } from '@/lib/plus';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const userId = await getRequestUserId(request);

    const event = await db.query.customEvents.findFirst({
      where: (event: any, { eq }: any) => eq(event.id, eventId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isPlus: true,
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
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!event.isPublic) {
      if (!userId) {
        return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
      }

      const user = await getDbUserById(userId);
      if (isHngrPlusEnabled() && !isPlusActive(user)) {
        return NextResponse.json({ error: 'hngr+ required' }, { status: 402 });
      }
    }

    return NextResponse.json({ data: serializeCustomEvent(event) });
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const user = await getDbUserById(userId);
    if (isHngrPlusEnabled() && !isPlusActive(user)) {
      return NextResponse.json(
        { error: 'hngr+ membership required to edit events' },
        { status: 402 }
      );
    }

    const existingEvent = await db.query.customEvents.findFirst({
      where: (event: any, { eq }: any) => eq(event.id, eventId),
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (existingEvent.creatorId !== userId) {
      return NextResponse.json(
        { error: 'Only event creator can update events' },
        { status: 403 }
      );
    }

    const eventData = await request.json();
    const nextEventDate = eventData.event_date ? new Date(eventData.event_date) : existingEvent.eventDate;
    const nextTitle = eventData.title !== undefined ? eventData.title.trim() : existingEvent.title;
    const nextDescription = eventData.description !== undefined ? eventData.description?.trim() || null : existingEvent.description;
    const nextLocation = eventData.location !== undefined ? eventData.location?.trim() || null : existingEvent.location;
    const nextMaxAttendees = eventData.max_attendees !== undefined ? eventData.max_attendees : existingEvent.maxAttendees;
    const nextIsPublic = eventData.is_public !== undefined ? eventData.is_public : existingEvent.isPublic;

    const updated = await db
      .update(customEvents)
      .set({
        updatedAt: new Date(),
        eventDate: nextEventDate,
        title: nextTitle,
        description: nextDescription,
        location: nextLocation,
        maxAttendees: nextMaxAttendees,
        isPublic: nextIsPublic,
      })
      .where(eq(customEvents.id, eventId))
      .returning();

    return NextResponse.json({ data: serializeCustomEvent(updated[0]) });
  } catch (error: any) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update event' },
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

    const user = await getDbUserById(userId);
    if (isHngrPlusEnabled() && !isPlusActive(user)) {
      return NextResponse.json(
        { error: 'hngr+ membership required to delete events' },
        { status: 402 }
      );
    }

    const existingEvent = await db.query.customEvents.findFirst({
      where: (event: any, { eq }: any) => eq(event.id, eventId),
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (existingEvent.creatorId !== userId) {
      return NextResponse.json(
        { error: 'Only event creator can delete events' },
        { status: 403 }
      );
    }

    await db.delete(customEvents).where(eq(customEvents.id, eventId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete event' },
      { status: 500 }
    );
  }
}

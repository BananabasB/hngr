import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Check if user can join this event
    const { data: event, error: eventError } = await supabase
      .from('custom_events')
      .select('is_public, max_attendees, event_attendees(count)')
      .eq('id', params.eventId)
      .single();

    if (eventError) throw eventError;

    // Check if event is full
    if (event.max_attendees && (event.event_attendees?.[0]?.count || 0) >= event.max_attendees) {
      return NextResponse.json(
        { error: 'Event is full' },
        { status: 400 }
      );
    }

    // For private events, verify user is hngr+ member
    if (!event.is_public) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('is_plus, plus_expires_at')
        .eq('id', userId)
        .single();

      if (userError || !user?.is_plus || (user.plus_expires_at && new Date(user.plus_expires_at) <= new Date())) {
        return NextResponse.json(
          { error: 'hngr+ membership required to join private events' },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from('event_attendees')
      .insert({
        event_id: params.eventId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Already joined this event' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ data });
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
  { params }: { params: { eventId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', params.eventId)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error leaving event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to leave event' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Check if user can join this event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('custom_events')
      .select('is_public, max_attendees, event_attendees(count)')
      .eq('id', eventId)
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
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('is_plus, plus_expires_at')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.is_plus || (userData.plus_expires_at && new Date(userData.plus_expires_at) <= new Date())) {
        return NextResponse.json(
          { error: 'hngr+ membership required to join private events' },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from('event_attendees')
      .insert({
        event_id: eventId,
        user_id: user.id,
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
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const { error } = await supabaseAdmin
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);

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

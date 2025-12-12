import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { data, error } = await supabase
      .from('custom_events')
      .select(`
        *,
        creator:users(id, username, display_name, avatar_url),
        event_attendees(
          id,
          user_id,
          joined_at,
          user:users(id, username, display_name, avatar_url)
        )
      `)
      .eq('id', params.eventId)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
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
  { params }: { params: { eventId: string } }
) {
  try {
    const eventData = await request.json();
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Verify user is the event creator
    const { data: existingEvent, error: fetchError } = await supabase
      .from('custom_events')
      .select('creator_id')
      .eq('id', params.eventId)
      .single();

    if (fetchError || existingEvent?.creator_id !== userId) {
      return NextResponse.json(
        { error: 'Only event creator can update events' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('custom_events')
      .update(eventData)
      .eq('id', params.eventId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
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

    // Verify user is the event creator
    const { data: existingEvent, error: fetchError } = await supabase
      .from('custom_events')
      .select('creator_id')
      .eq('id', params.eventId)
      .single();

    if (fetchError || existingEvent?.creator_id !== userId) {
      return NextResponse.json(
        { error: 'Only event creator can delete events' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('custom_events')
      .delete()
      .eq('id', params.eventId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete event' },
      { status: 500 }
    );
  }
}

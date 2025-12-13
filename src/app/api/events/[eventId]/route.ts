import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function getUserIdFromAuth(header: string | null): string | null {
  if (!header) return null;
  if (!header.startsWith('Bearer ')) return null;
  return header.replace('Bearer ', '').trim() || null;
}

function isPlusActive(user: { is_plus: boolean; plus_expires_at: string | null } | null) {
  if (!user?.is_plus) return false;
  if (!user.plus_expires_at) return true;
  return new Date(user.plus_expires_at) > new Date();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection unavailable' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const requesterId = getUserIdFromAuth(authHeader);

    if (!requesterId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const { data: requester, error: requesterError } = await supabase
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', requesterId)
      .single();

    if (requesterError && requesterError.code !== 'PGRST116') {
      console.error('Error verifying membership for event GET:', requesterError);
      return NextResponse.json(
        { error: 'Unable to verify membership status' },
        { status: 500 }
      );
    }

    if (!isPlusActive(requester ?? null)) {
      return NextResponse.json(
        { error: 'hngr+ membership required to view events' },
        { status: 402 }
      );
    }

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
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection unavailable' }, { status: 500 });
    }

    const eventData = await request.json();
    const authHeader = request.headers.get('authorization');
    const userId = getUserIdFromAuth(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error verifying membership for event PUT:', userError);
      return NextResponse.json(
        { error: 'Unable to verify membership status' },
        { status: 500 }
      );
    }

    if (!isPlusActive(user ?? null)) {
      return NextResponse.json(
        { error: 'hngr+ membership required to edit events' },
        { status: 402 }
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
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection unavailable' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const userId = getUserIdFromAuth(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error verifying membership for event DELETE:', userError);
      return NextResponse.json(
        { error: 'Unable to verify membership status' },
        { status: 500 }
      );
    }

    if (!isPlusActive(user ?? null)) {
      return NextResponse.json(
        { error: 'hngr+ membership required to delete events' },
        { status: 402 }
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

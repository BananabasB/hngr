import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabase/server';

function isPlusActive(user: { is_plus: boolean; plus_expires_at: string | null } | null) {
  if (!user?.is_plus) return false;
  if (!user.plus_expires_at) return true;
  return new Date(user.plus_expires_at) > new Date();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', user.id)
      .single();

    if (requesterError && requesterError.code !== 'PGRST116') {
      console.error('Error verifying membership for events GET:', requesterError);
      return NextResponse.json(
        { error: 'Unable to verify membership status' },
        { status: 500 }
      );
    }

    if (!isPlusActive(requester ?? null)) {
      return NextResponse.json({ error: 'hngr+ required' }, { status: 402 });
    }

    // Get event with attendees count
    const { data: event, error: eventError } = await supabaseAdmin
      .from('custom_events')
      .select(`
        *,
        event_attendees(count),
        users!custom_events_owner_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('id', eventId)
      .single();

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      throw eventError;
    }

    return NextResponse.json({ data: event });
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
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const eventData = await request.json();

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error verifying membership for event PUT:', userError);
      return NextResponse.json(
        { error: 'Unable to verify membership status' },
        { status: 500 }
      );
    }

    if (!isPlusActive(userData ?? null)) {
      return NextResponse.json(
        { error: 'hngr+ membership required to edit events' },
        { status: 402 }
      );
    }

    // Verify user is event creator
    const { data: existingEvent, error: fetchError } = await supabaseAdmin
      .from('custom_events')
      .select('creator_id')
      .eq('id', eventId)
      .single();

    if (fetchError || existingEvent?.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Only event creator can update events' },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('custom_events')
      .update(eventData)
      .eq('id', eventId)
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

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error verifying membership for event DELETE:', userError);
      return NextResponse.json(
        { error: 'Unable to verify membership status' },
        { status: 500 }
      );
    }

    if (!isPlusActive(userData ?? null)) {
      return NextResponse.json(
        { error: 'hngr+ membership required to delete events' },
        { status: 402 }
      );
    }

    // Verify user is event creator
    const { data: existingEvent, error: fetchError } = await supabaseAdmin
      .from('custom_events')
      .select('creator_id')
      .eq('id', eventId)
      .single();

    if (fetchError || existingEvent?.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Only event creator can delete events' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('custom_events')
      .delete()
      .eq('id', eventId);

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

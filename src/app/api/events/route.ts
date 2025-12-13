import { NextRequest, NextResponse } from 'next/server';
import { CreateCustomEventRequest } from '@/lib/supabase/types';
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

export async function GET(request: NextRequest) {
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
      console.error('Error verifying membership for events GET:', requesterError);
      return NextResponse.json(
        { error: 'Unable to verify membership status' },
        { status: 500 }
      );
    }

    if (!isPlusActive(requester ?? null)) {
      return NextResponse.json({ error: 'hngr+ required' }, { status: 402 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const isPublic = searchParams.get('public') === 'true';

    let query = supabase
      .from('custom_events')
      .select(`
        *,
        creator:users(id, username, display_name, avatar_url),
        event_attendees(id, user_id, joined_at),
        attendee_count:event_attendees(count)
      `)
      .order('event_date', { ascending: true });

    // Filter by creator if specified
    if (userId) {
      query = query.eq('creator_id', userId);
    }

    // Filter by public visibility
    if (isPublic !== undefined) {
      query = query.eq('is_public', isPublic);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
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
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection unavailable' }, { status: 500 });
    }

    const eventData: CreateCustomEventRequest = await request.json();
    const authHeader = request.headers.get('authorization');
    const userId = getUserIdFromAuth(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    // Verify user is hngr+ member
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error verifying membership for events POST:', userError);
      return NextResponse.json(
        { error: 'Unable to verify membership status' },
        { status: 500 }
      );
    }

    if (!isPlusActive(user ?? null)) {
      return NextResponse.json({ error: 'hngr+ required' }, { status: 402 });
    }

    const { data, error } = await supabase
      .from('custom_events')
      .insert({
        ...eventData,
        creator_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}

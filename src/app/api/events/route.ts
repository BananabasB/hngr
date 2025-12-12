import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateCustomEventRequest, CustomEventWithDetails } from '@/lib/supabase/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
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
    const eventData: CreateCustomEventRequest = await request.json();
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');

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

    if (userError || !user?.is_plus || (user.plus_expires_at && new Date(user.plus_expires_at) <= new Date())) {
      return NextResponse.json(
        { error: 'hngr+ membership required to create events' },
        { status: 403 }
      );
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

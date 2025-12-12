import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CreateGameEventRequest, GameEvent } from '@/lib/supabase/game-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('game_id');
    const eventType = searchParams.get('event_type');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    let query = supabase
      .from('game_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching game events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateGameEventRequest = await request.json();

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('game_events')
      .insert({
        game_id: body.game_id,
        event_type: body.event_type,
        description: body.description,
        participant_ids: body.participant_ids || [],
        district_ids: body.district_ids || [],
        event_data: body.event_data || {},
        severity: body.severity || 'normal'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error creating game event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

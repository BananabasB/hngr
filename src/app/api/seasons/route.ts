import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAuthenticatedSupabaseClient();

    // Get seasons for the user
    const { data: seasons, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get game counts for each season
    const seasonsWithCounts = await Promise.all(
      (seasons || []).map(async (season) => {
        const { count } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', season.id);

        return {
          ...season,
          game_count: count || 0,
          has_current_game: !!season.current_game_id,
        };
      })
    );

    return NextResponse.json(seasonsWithCounts);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seasons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/seasons - Starting request');
    
    const user = await getAuthenticatedUser();
    
    if (!user) {
      console.log('User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);
    const supabase = await createAuthenticatedSupabaseClient();

    const body = await request.json();
    console.log('Request body:', body);
    const { name, description } = body;

    if (!name?.trim()) {
      console.log('Missing season name');
      return NextResponse.json(
        { error: 'Season name is required' },
        { status: 400 }
      );
    }

    // Create the season
    console.log('Creating season with owner_id:', user.id);
    const { data: season, error } = await supabase
      .from('seasons')
      .insert({
        name: name.trim(),
        description: description?.trim() || undefined,
        owner_id: user.id,
      })
      .select()
      .single();

    console.log('Season creation result:', { season, error });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Season created successfully:', season);
    return NextResponse.json(season);
  } catch (error) {
    console.error('Error creating season:', error);
    return NextResponse.json(
      { error: 'Failed to create season', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

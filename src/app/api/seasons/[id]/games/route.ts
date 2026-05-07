import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { SeasonService } from '@/lib/supabase/services/seasons';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const games = await SeasonService.getSeasonGames(params.id);
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching season games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season games' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAuthenticatedSupabaseClient();
    const body = await request.json();
    const { name, tribute_data, game_number, is_public } = body;

    if (!name?.trim() || !tribute_data) {
      return NextResponse.json(
        { error: 'Game name and tribute data are required' },
        { status: 400 }
      );
    }

    // Create game with season_id
    const { data, error } = await supabase
      .from('games')
      .insert([{
        name: name.trim(),
        season_id: params.id,
        tribute_data,
        game_number: game_number || 1,
        is_public: is_public || false,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating season game:', error);
    return NextResponse.json(
      { error: 'Failed to create season game' },
      { status: 500 }
    );
  }
}

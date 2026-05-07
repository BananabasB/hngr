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

    const supabase = await createAuthenticatedSupabaseClient();
    const season = await SeasonService.getSeasonById(params.id);
    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    return NextResponse.json(season);
  } catch (error) {
    console.error('Error fetching season:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { name, description, status, current_game_id } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || undefined;
    if (status !== undefined) updateData.status = status;
    if (current_game_id !== undefined) updateData.current_game_id = current_game_id;

    const season = await SeasonService.updateSeason(params.id, updateData);
    return NextResponse.json(season);
  } catch (error) {
    console.error('Error updating season:', error);
    return NextResponse.json(
      { error: 'Failed to update season' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAuthenticatedSupabaseClient();
    await SeasonService.deleteSeason(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting season:', error);
    return NextResponse.json(
      { error: 'Failed to delete season' },
      { status: 500 }
    );
  }
}

import type { Season, SeasonWithGames, CreateSeasonRequest, UpdateSeasonRequest } from '../season-types';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SeasonService {
  // Get all seasons for the current user
  static async getUserSeasons(supabaseClient: SupabaseClient, userId: string): Promise<SeasonWithGames[]> {
    // Get seasons with game counts
    const { data: seasons, error } = await supabaseClient
      .from('seasons')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get game counts for each season
    const seasonsWithCounts = await Promise.all(
      (seasons || []).map(async (season) => {
        const { count } = await supabaseClient
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

    return seasonsWithCounts;
  }

  // Get a specific season by ID
  static async getSeasonById(supabaseClient: SupabaseClient, seasonId: string): Promise<Season | null> {
    const { data, error } = await supabaseClient
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single();

    if (error) throw error;
    return data;
  }

  // Create a new season
  static async createSeason(supabaseClient: SupabaseClient, userId: string, request: CreateSeasonRequest): Promise<Season> {
    const { data, error } = await supabaseClient
      .from('seasons')
      .insert({
        ...request,
        owner_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update a season
  static async updateSeason(supabaseClient: SupabaseClient, userId: string, seasonId: string, updateData: UpdateSeasonRequest): Promise<Season> {
    const { data, error } = await supabaseClient
      .from('seasons')
      .update(updateData)
      .eq('id', seasonId)
      .eq('owner_id', userId) // Ensure user owns the season
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete a season
  static async deleteSeason(supabaseClient: SupabaseClient, userId: string, seasonId: string): Promise<void> {
    console.log('SeasonService.deleteSeason called with:', { userId, seasonId });

    const { error, count } = await supabaseClient
      .from('seasons')
      .delete({ count: 'exact' })
      .eq('id', seasonId)
      .eq('owner_id', userId); // Ensure user owns the season

    console.log('Delete result:', { error, count });

    if (error) {
      console.error('Delete error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to delete season: ${error.message}`);
    }

    if (count === 0) {
      throw new Error('Season not found or you do not have permission to delete it');
    }
  }

  // Set current game for a season
  static async setCurrentGame(supabaseClient: SupabaseClient, seasonId: string, gameId: string): Promise<void> {
    const { error } = await supabaseClient.rpc('set_current_game_for_season', {
      p_season_id: seasonId,
      p_game_id: gameId
    });

    if (error) throw error;
  }
}

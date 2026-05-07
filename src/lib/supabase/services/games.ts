import type { Game, CreateGameRequest, UpdateGameRequest } from '../season-types';
import type { SupabaseClient } from '@supabase/supabase-js';

export class GameService {
  // Get games for a specific season
  static async getSeasonGames(supabaseClient: SupabaseClient, seasonId: string): Promise<Game[]> {
    const { data, error } = await supabaseClient
      .from('games')
      .select('*')
      .eq('season_id', seasonId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Get current game for a season
  static async getCurrentGame(supabaseClient: SupabaseClient, seasonId: string): Promise<Game | null> {
    const { data, error } = await supabaseClient
      .from('games')
      .select('*')
      .eq('season_id', seasonId)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data;
  }

  // Create a new game in a season
  static async createGame(supabaseClient: SupabaseClient, gameData: CreateGameRequest): Promise<Game> {
    // If season_id is provided, get the next game number
    let gameNumber = gameData.game_number || 1;
    if (gameData.season_id) {
      const { data: existingGames } = await supabaseClient
        .from('games')
        .select('game_number')
        .eq('season_id', gameData.season_id)
        .order('game_number', { ascending: false })
        .limit(1);

      if (existingGames && existingGames.length > 0) {
        gameNumber = existingGames[0].game_number + 1;
      }
    }

    const { data, error } = await supabaseClient
      .from('games')
      .insert([{
        ...gameData,
        game_number: gameNumber,
        is_current: false, // Don't set as current by default
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update a game
  static async updateGame(supabaseClient: SupabaseClient, gameId: string, updateData: UpdateGameRequest): Promise<Game> {
    const { data, error } = await supabaseClient
      .from('games')
      .update(updateData)
      .eq('id', gameId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Set a game as current in its season
  static async setCurrentGame(supabaseClient: SupabaseClient, gameId: string): Promise<Game> {
    // First, get the game to find its season_id
    const { data: game, error: fetchError } = await supabaseClient
      .from('games')
      .select('season_id')
      .eq('id', gameId)
      .single();

    if (fetchError) throw fetchError;
    if (!game?.season_id) throw new Error('Game must belong to a season to be set as current');

    // Update all games in the season to not be current
    await supabaseClient
      .from('games')
      .update({ is_current: false })
      .eq('season_id', game.season_id);

    // Set this game as current
    const { data, error } = await supabaseClient
      .from('games')
      .update({ is_current: true })
      .eq('id', gameId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete a game
  static async deleteGame(supabaseClient: SupabaseClient, gameId: string): Promise<void> {
    const { error } = await supabaseClient
      .from('games')
      .delete()
      .eq('id', gameId);

    if (error) throw error;
  }

  // Get all user games (including those without seasons)
  static async getUserGames(supabaseClient: SupabaseClient, userId: string): Promise<Game[]> {
    const { data, error } = await supabaseClient
      .from('games')
      .select('*')
      .or(`season_id.is.null,season_id.in.(select id from seasons where owner_id='${userId}')`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setupDatabase, HngrDB } from './setup';
import { updateReferralName as updateReferralNameUtil } from './database';
import type { Tribute } from './setup';
import type { Season, SeasonWithGames, Game } from './supabase/season-types';
import { SeasonService } from './supabase/services/seasons';
import { GameService } from './supabase/services/games';

interface StateContextType {
  db: HngrDB | null;
  setDb: (db: HngrDB) => void;
  updateReferralName: (value: "tributes" | "volunteers" | "nominees") => void;
  saveDbToCurrentGame: () => Promise<void>;
  // Season management
  currentSeason: Season | null;
  seasons: SeasonWithGames[];
  setCurrentSeason: (season: Season | null) => void;
  refreshSeasons: () => Promise<void>;
  createSeason: (name: string, description?: string) => Promise<Season>;
  // Game management
  currentGame: Game | null;
  seasonGames: Game[];
  refreshGames: () => Promise<void>;
  createGame: (name: string, tributeData: any) => Promise<Game>;
  setCurrentGame: (game: Game | null) => void;
}

const StateContext = createContext<StateContextType | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [dbState, setDbState] = useState<HngrDB | null>(null);
  const [seasons, setSeasons] = useState<SeasonWithGames[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [seasonGames, setSeasonGames] = useState<Game[]>([]);
  const { getToken, isSignedIn } = useAuth();
  const [currentGame, setCurrentGame] = useState<Game | null>(null);

  // Define all functions before useEffects
  const refreshSeasons = useCallback(async () => {
    try {
      if (!isSignedIn) {
        return;
      }

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        return;
      }

      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return;
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const userId = payload.sub;

      if (!userId) {
        return;
      }

      const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
      const supabaseClient = createSupabaseClientWithToken(token);

      const { data: seasons, error } = await supabaseClient
        .from('seasons')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

      setSeasons(seasonsWithCounts);

      // Load saved current season ID from localStorage
      const savedSeasonId = localStorage.getItem('current-season-id');
      
      // Set current season priority: saved season > current season > first season
      let seasonToSet: SeasonWithGames | null = null;
      
      if (savedSeasonId) {
        const savedSeason = seasonsWithCounts.find(s => s.id === savedSeasonId);
        if (savedSeason) {
          seasonToSet = savedSeason;
        }
      }
      
      if (!seasonToSet && currentSeason && seasonsWithCounts.find(s => s.id === currentSeason.id)) {
        const currentSeasonWithCounts = seasonsWithCounts.find(s => s.id === currentSeason.id);
        if (currentSeasonWithCounts) {
          seasonToSet = currentSeasonWithCounts;
        }
      }
      
      if (!seasonToSet && seasonsWithCounts.length > 0) {
        seasonToSet = seasonsWithCounts[0];
      }
      
      if (seasonToSet) {
        setCurrentSeason(seasonToSet);
        localStorage.setItem('current-season-id', seasonToSet.id);
      }
    } catch (error) {
      console.error('Failed to refresh seasons:', error);
    }
  }, [isSignedIn, getToken, currentSeason]);

  const refreshGames = useCallback(async () => {
    if (!currentSeason) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        return;
      }

      const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
      const supabaseClient = createSupabaseClientWithToken(token);

      const games = await GameService.getSeasonGames(supabaseClient, currentSeason.id);
      setSeasonGames(games);

      const current = games.find(g => g.is_current) || games[0];
      setCurrentGame(current || null);

      // Load tribute data and events from current game into local db state
      if (current?.tribute_data) {
        const database = setupDatabase();
        database.tributes = current.tribute_data.tributes || {};
        database.events = current.tribute_data.events || {};
        if (current.tribute_data.tributeReferralName) {
          database.tributeReferralName = current.tribute_data.tributeReferralName;
        }
        setDbState(database);
      } else {
        // No current game, use default database with blank tributes and empty events
        const database = setupDatabase();
        setDbState(database);
      }
    } catch (error) {
      console.error('Failed to refresh games:', error);
      setSeasonGames([]);
      setCurrentGame(null);
    }
  }, [currentSeason, getToken]);

  const createSeason = useCallback(async (name: string, description?: string): Promise<Season> => {
    if (!isSignedIn) {
      throw new Error('User not signed in');
    }

    const token = await getToken({ template: 'supabase' });
    if (!token) {
      throw new Error('User not authenticated - no token');
    }

    const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
    const supabaseClient = createSupabaseClientWithToken(token);

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    const userId = payload.sub;
    if (!userId) {
      throw new Error('User not authenticated - no user ID found in token');
    }

    const { data: season, error } = await supabaseClient
      .from('seasons')
      .insert({
        name: name.trim(),
        description: description?.trim() || undefined,
        owner_id: userId,
        status: 'active', // Default status
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create season: ${error.message}`);
    }

    await refreshSeasons();
    return season;
  }, [isSignedIn, getToken, refreshSeasons]);

  const createGame = useCallback(async (name: string, tributeData: any): Promise<Game> => {
    if (!currentSeason) throw new Error('No season selected');

    const token = await getToken({ template: 'supabase' });
    if (!token) {
      throw new Error('User not authenticated - no token');
    }

    const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
    const supabaseClient = createSupabaseClientWithToken(token);

    const game = await GameService.createGame(supabaseClient, {
      name,
      tribute_data: tributeData,
      season_id: currentSeason.id,
    });
    await refreshGames();
    return game;
  }, [currentSeason, getToken, refreshGames]);

  const handleSetCurrentGame = useCallback(async (game: Game | null) => {
    if (game) {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('User not authenticated - no token');
      }

      const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
      const supabaseClient = createSupabaseClientWithToken(token);

      await GameService.setCurrentGame(supabaseClient, game.id);
      await refreshGames();
    } else {
      setCurrentGame(null);
    }
  }, [getToken, refreshGames]);

  const saveDbToCurrentGame = useCallback(async (db?: HngrDB) => {
    const dataToSave = db || dbState;
    if (!dataToSave || !currentGame || !isSignedIn) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
      const supabaseClient = createSupabaseClientWithToken(token);

      await GameService.updateGame(supabaseClient, currentGame.id, {
        tribute_data: {
          tributes: dataToSave.tributes,
          events: dataToSave.events,
          tributeReferralName: dataToSave.tributeReferralName,
        },
      });
    } catch (error) {
      console.error('Failed to save db to game:', error);
    }
  }, [dbState, currentGame, isSignedIn, getToken]);

  const setDb = useCallback((newDb: HngrDB) => {
    setDbState(newDb);
    // Auto-save to current game
    saveDbToCurrentGame(newDb);
  }, [saveDbToCurrentGame]);

  const handleUpdateReferralName = useCallback((value: "tributes" | "volunteers" | "nominees") => {
    if (!dbState) return;
    const updated = updateReferralNameUtil(dbState, value);
    setDbState(updated);
    // Auto-save to current game
    saveDbToCurrentGame(updated);
  }, [dbState, saveDbToCurrentGame]);

  // Initialize database on mount
  useEffect(() => {
    const database = setupDatabase();
    setDbState(database);
  }, []);

  // Load seasons when signed in
  useEffect(() => {
    if (isSignedIn) {
      refreshSeasons();
    }
  }, [isSignedIn, refreshSeasons]);

  // Load games when season changes
  useEffect(() => {
    if (currentSeason && isSignedIn) {
      refreshGames();
    } else {
      setSeasonGames([]);
      setCurrentGame(null);
    }
  }, [currentSeason, isSignedIn, refreshGames]);

  // Wrap setCurrentSeason to also save to localStorage
  const handleSetCurrentSeason = useCallback((season: Season | null) => {
    console.log('Setting current season:', season?.name || 'null');
    setCurrentSeason(season);
    if (season) {
      localStorage.setItem('current-season-id', season.id);
    } else {
      localStorage.removeItem('current-season-id');
    }
  }, []);

  // Create initial game when season has no games
  useEffect(() => {
    if (currentSeason && seasonGames.length === 0 && isSignedIn && dbState) {
      const createInitialGame = async () => {
        try {
          const token = await getToken({ template: 'supabase' });
          if (!token) return;

          const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
          const supabaseClient = createSupabaseClientWithToken(token);

          // Get user ID from token
          const tokenParts = token.split('.');
          if (tokenParts.length !== 3) return;
          
          const payload = JSON.parse(atob(tokenParts[1]));
          const userId = payload.sub;
          if (!userId) return;

          await GameService.createGame(supabaseClient, {
            name: "Game 1",
            tribute_data: dbState,
            season_id: currentSeason.id,
            owner_id: userId, // Add the required owner_id
          });
          
          // Refresh games to get the newly created game
          await refreshGames();
        } catch (error) {
          // Create a proper error that Next.js dev overlay can display
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorDetails = error && typeof error === 'object' ? JSON.stringify(error, null, 2) : 'Not an object';
          
          const enhancedError = new Error(
            `Failed to create initial game for season ${currentSeason.id}: ${errorMessage}\n\nDetails: ${errorDetails}`
          );
          
          enhancedError.stack = error instanceof Error ? error.stack : undefined;
          
          // Log to console for good measure
          console.error('Game creation failed:', {
            error,
            errorMessage,
            errorDetails,
            seasonId: currentSeason.id,
            hasDb: !!dbState,
            dbStateKeys: dbState ? Object.keys(dbState) : [],
            tributesCount: dbState?.tributes ? Object.keys(dbState.tributes).length : 0
          });
          
          throw enhancedError;
        }
      };
      
      createInitialGame();
    }
  }, [currentSeason, seasonGames.length, isSignedIn, dbState, getToken, refreshGames]);

  return (
    <StateContext.Provider value={{
      db: dbState,
      setDb,
      updateReferralName: handleUpdateReferralName,
      saveDbToCurrentGame,
      seasons,
      currentSeason,
      setCurrentSeason: handleSetCurrentSeason,
      seasonGames,
      currentGame,
      setCurrentGame: handleSetCurrentGame,
      refreshSeasons,
      createSeason,
      refreshGames,
      createGame,
    }}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
}

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setupDatabase, HngrDB } from './setup';
import { updateReferralName as updateReferralNameUtil } from './database';
import type { Tribute } from './setup';
import type { Season, SeasonWithGames, Game } from './supabase/season-types';
import { SeasonService } from './supabase/services/seasons';
import { GameService } from './supabase/services/games';
import { StorageService } from './storage-service';

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
  const { getToken, isSignedIn, userId } = useAuth();
  const [dbState, setDbState] = useState<HngrDB | null>(null);
  const [seasons, setSeasons] = useState<SeasonWithGames[]>([]);
  const [currentSeason, setCurrentSeasonState] = useState<Season | null>(null);
  const [seasonGames, setSeasonGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGameState] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storageService = StorageService.getInstance();

  // Initialize storage service with Supabase client
  useEffect(() => {
    const initStorage = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.log('No token available, using unauthenticated client');
          // Create unauthenticated client for read operations
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
          );
          storageService.setSupabaseClient(supabaseClient);
        } else {
          // Create authenticated client with JWT token
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            }
          );
          storageService.setSupabaseClient(supabaseClient);
        }
      } catch (err) {
        console.error('Failed to initialize storage:', err);
        setError('Failed to initialize storage service');
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn) {
      initStorage();
    } else {
      setLoading(false);
    }
  }, [isSignedIn, getToken]);

  // Load seasons
  const refreshSeasons = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
      const supabaseClient = createSupabaseClientWithToken(token);

      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return;
      const payload = JSON.parse(atob(tokenParts[1]));
      const userId = payload.sub;
      if (!userId) return;

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
      setError(null);
    } catch (error) {
      console.error('Failed to refresh seasons:', error);
      setError('Failed to load seasons');
    }
  }, [isSignedIn, getToken]);

  // Load games for current season
  const refreshGames = useCallback(async () => {
    if (!currentSeason || !isSignedIn) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
      const supabaseClient = createSupabaseClientWithToken(token);

      const games = await GameService.getSeasonGames(supabaseClient, currentSeason.id);
      setSeasonGames(games);

      const current = games.find(g => g.is_current) || games[0];
      setCurrentGameState(current || null);

      // Load database from current game
      if (current) {
        const db = await storageService.getDatabase();
        setDbState(db);
      } else {
        // No current game, create one
        const database = setupDatabase();
        setDbState(database);
        
        try {
          const tokenParts = token.split('.');
          const payload = JSON.parse(atob(tokenParts[1]));
          const userId = payload.sub;

          await GameService.createGame(supabaseClient, {
            name: "Game 1",
            tribute_data: database,
            season_id: currentSeason.id,
            owner_id: userId,
          });
          
          await refreshGames();
        } catch (createError) {
          console.error('Failed to create initial game:', createError);
        }
      }
    } catch (error) {
      console.error('Failed to refresh games:', error);
      setError('Failed to load games');
      setSeasonGames([]);
      setCurrentGameState(null);
    }
  }, [currentSeason, isSignedIn, getToken]);

  // Create season
  const createSeason = useCallback(async (name: string, description?: string): Promise<Season> => {
    if (!isSignedIn) {
      throw new Error('User not signed in');
    }

    try {
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
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      await refreshSeasons();
      return season;
    } catch (error) {
      console.error("Failed to create season:", error);
      throw error;
    }
  }, [isSignedIn, getToken, refreshSeasons]);

  // Create game
  const createGame = useCallback(async (name: string, tributeData: any): Promise<Game> => {
    if (!currentSeason) throw new Error('No season selected');

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('User not authenticated - no token');
      }

      const { createSupabaseClientWithToken } = await import('./supabase/clerk-client');
      const supabaseClient = createSupabaseClientWithToken(token);

      const tokenParts = token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      const userId = payload.sub;

      const game = await GameService.createGame(supabaseClient, {
        name,
        tribute_data: tributeData,
        season_id: currentSeason.id,
        owner_id: userId,
      });
      
      await refreshGames();
      return game;
    } catch (error) {
      console.error('Failed to create game:', error);
      throw error;
    }
  }, [currentSeason, getToken, refreshGames]);

  // Set current season
  const setCurrentSeason = useCallback(async (season: Season | null) => {
    setCurrentSeasonState(season);
    if (season) {
      await storageService.setCurrentSeason(season);
    } else {
      await storageService.setCurrentSeason(null);
    }
  }, []);

  // Set current game
  const handleSetCurrentGame = useCallback(async (game: Game | null) => {
    setCurrentGameState(game);
    if (game) {
      await storageService.setCurrentGame(game.id);
    }
  }, []);

  // Save database
  const saveDbToCurrentGame = useCallback(async () => {
    if (!dbState) return;

    try {
      await storageService.saveDatabase(dbState);
    } catch (error) {
      console.error('Failed to save db to game:', error);
      throw error;
    }
  }, [dbState]);

  // Update referral name
  const handleUpdateReferralName = useCallback((value: "tributes" | "volunteers" | "nominees") => {
    if (!dbState) return;
    const updated = updateReferralNameUtil(dbState, value);
    setDbState(updated);
    saveDbToCurrentGame();
  }, [dbState, saveDbToCurrentGame]);

  // Set db with auto-save
  const setDb = useCallback((newDb: HngrDB) => {
    setDbState(newDb);
    saveDbToCurrentGame();
  }, [saveDbToCurrentGame]);

  // Load initial data
  useEffect(() => {
    if (isSignedIn && !loading) {
      refreshSeasons();
    }
  }, [isSignedIn, loading, refreshSeasons]);

  // Load games when season changes
  useEffect(() => {
    if (currentSeason && isSignedIn) {
      refreshGames();
    } else {
      setSeasonGames([]);
      setCurrentGameState(null);
    }
  }, [currentSeason, isSignedIn, refreshGames]);

  // Load saved current season
  useEffect(() => {
    if (seasons.length > 0) {
      const loadSavedSeason = async () => {
        const savedSeason = await storageService.getCurrentSeason();
        if (savedSeason) {
          setCurrentSeason(savedSeason);
        } else if (seasons.length > 0) {
          setCurrentSeason(seasons[0]);
        }
      };
      loadSavedSeason();
    }
  }, [seasons, setCurrentSeason]);

  return (
    <StateContext.Provider value={{
      db: dbState,
      setDb,
      updateReferralName: handleUpdateReferralName,
      saveDbToCurrentGame,
      seasons,
      currentSeason,
      setCurrentSeason,
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

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { setupDatabase, HngrDB, normalizeDatabase } from "./setup";
import { updateReferralName as updateReferralNameUtil } from "./database";
import type { Season, SeasonWithGames, Game } from "./supabase/season-types";
import { save, load } from "./localStorage";

interface StateContextType {
  db: HngrDB | null;
  setDb: (db: HngrDB) => void;
  updateReferralName: (value: "tributes" | "volunteers" | "nominees") => void;
  saveDbToCurrentGame: () => Promise<void>;
  currentSeason: Season | null;
  seasons: SeasonWithGames[];
  setCurrentSeason: (season: Season | null) => void;
  refreshSeasons: () => Promise<void>;
  createSeason: (name: string, description?: string) => Promise<Season>;
  currentGame: Game | null;
  seasonGames: Game[];
  refreshGames: () => Promise<void>;
  createGame: (name: string, tributeData: any) => Promise<Game>;
  setCurrentGame: (game: Game | null) => void;
}

const StateContext = createContext<StateContextType | null>(null);
const LOCAL_SEASON_ID = "local-season";
const LOCAL_GAME_ID = "local-game";

function getCurrentSeasonId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("current-season-id");
}

function createLocalSeason(): SeasonWithGames {
  const now = new Date().toISOString();
  return {
    id: LOCAL_SEASON_ID,
    owner_id: "local",
    name: "Local Season",
    description: "Stored in this browser until Supabase is ready.",
    status: "active",
    current_game_id: LOCAL_GAME_ID,
    created_at: now,
    updated_at: now,
    game_count: 1,
    has_current_game: true,
  };
}

function createLocalGame(db: HngrDB): Game {
  const now = new Date().toISOString();
  return {
    id: LOCAL_GAME_ID,
    owner_id: "local",
    season_id: LOCAL_SEASON_ID,
    name: "Local Game",
    tribute_data: db,
    game_number: 1,
    is_current: true,
    is_public: false,
    created_at: now,
    updated_at: now,
  };
}

function loadLocalDb(): HngrDB {
  return normalizeDatabase(load<HngrDB>("hngr-db") || setupDatabase());
}

export function StateProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [dbState, setDbState] = useState<HngrDB | null>(null);
  const [seasons, setSeasons] = useState<SeasonWithGames[]>([]);
  const [currentSeason, setCurrentSeasonState] = useState<Season | null>(null);
  const [seasonGames, setSeasonGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGameState] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);
  const currentSeasonRef = useRef<Season | null>(null);
  const usingLocalFallbackRef = useRef(false);

  // Initialize local DB on mount
  useEffect(() => {
    if (!dbState) {
      setDbState(loadLocalDb());
    }
  }, []);

  const activateLocalFallback = useCallback((dbOverride?: HngrDB) => {
    const localDb = dbOverride || loadLocalDb();
    const localSeason = createLocalSeason();
    const localGame = createLocalGame(localDb);

    usingLocalFallbackRef.current = true;
    currentSeasonRef.current = localSeason;
    setUsingLocalFallback(true);
    setDbState(localDb);
    setSeasons([localSeason]);
    setCurrentSeasonState(localSeason);
    setSeasonGames([localGame]);
    setCurrentGameState(localGame);
    if (typeof window !== "undefined") {
      localStorage.setItem("current-season-id", LOCAL_SEASON_ID);
    }
  }, []);

  const setCurrentSeason = useCallback((season: Season | null) => {
    currentSeasonRef.current = season;
    setCurrentSeasonState(season);
    if (typeof window === "undefined") return;
    if (season) {
      localStorage.setItem("current-season-id", season.id);
    } else {
      localStorage.removeItem("current-season-id");
    }
  }, []);

  const refreshGames = useCallback(async () => {
    const activeSeason = currentSeasonRef.current;

    if (!activeSeason) {
      setSeasonGames([]);
      setCurrentGameState(null);
      return;
    }

    if (activeSeason.id === LOCAL_SEASON_ID || usingLocalFallbackRef.current) {
      const localDb = loadLocalDb();
      setDbState(localDb);
      setSeasonGames([createLocalGame(localDb)]);
      setCurrentGameState(createLocalGame(localDb));
      return;
    }

    try {
      const response = await fetch(`/api/seasons/${activeSeason.id}/games`);
      if (!response.ok) {
        throw new Error(`Failed to fetch games (${response.status})`);
      }

      const games: Game[] = await response.json();
      setSeasonGames(games);

      const current = games.find((g) => g.is_current) || games[0] || null;
      setCurrentGameState(current);

      if (current?.tribute_data) {
        setDbState(current.tribute_data);
      } else {
        const database = setupDatabase();
        setDbState(database);

        if (games.length === 0) {
          await fetch(`/api/seasons/${activeSeason.id}/games`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Game 1",
              tribute_data: database,
              is_public: false,
            }),
          });

          const refreshed = await fetch(`/api/seasons/${activeSeason.id}/games`);
          if (refreshed.ok) {
            const refreshedGames: Game[] = await refreshed.json();
            setSeasonGames(refreshedGames);
            const refreshedCurrent = refreshedGames.find((g) => g.is_current) || refreshedGames[0] || null;
            setCurrentGameState(refreshedCurrent);
            if (refreshedCurrent?.tribute_data) {
              setDbState(refreshedCurrent.tribute_data);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Using local fallback for games:", error);
      activateLocalFallback();
    }
  }, [activateLocalFallback]);

  const refreshSeasons = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      activateLocalFallback(loadLocalDb());
      return;
    }

    try {
      const response = await fetch("/api/seasons");
      if (!response.ok) {
        throw new Error(`Failed to fetch seasons (${response.status})`);
      }

      const seasonsWithCounts: SeasonWithGames[] = await response.json();
      setUsingLocalFallback(false);
      usingLocalFallbackRef.current = false;
      setSeasons(seasonsWithCounts);

      const savedSeasonId = getCurrentSeasonId();
      const selectedSeason =
        (savedSeasonId && seasonsWithCounts.find((season) => season.id === savedSeasonId)) ||
        (currentSeasonRef.current && seasonsWithCounts.find((season) => season.id === currentSeasonRef.current?.id)) ||
        seasonsWithCounts[0] ||
        null;

      if (selectedSeason?.id !== currentSeasonRef.current?.id) {
        setCurrentSeason(selectedSeason);
      }
    } catch (error) {
      console.warn("Using local fallback for seasons:", error);
      activateLocalFallback();
    }
  }, [isLoaded, isSignedIn, setCurrentSeason, activateLocalFallback]);

  const createSeason = useCallback(async (name: string, description?: string): Promise<Season> => {
    if (usingLocalFallback) {
      const season: Season = {
        ...createLocalSeason(),
        name: name.trim(),
        description: description?.trim() || null,
      };
      setSeasons([season as SeasonWithGames]);
      setCurrentSeason(season);
      return season;
    }

    const response = await fetch("/api/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create season (${response.status})`);
    }

    const season: Season = await response.json();
    await refreshSeasons();
    return season;
  }, [refreshSeasons, setCurrentSeason, usingLocalFallback]);

  const createGame = useCallback(async (name: string, tributeData: any): Promise<Game> => {
    const activeSeason = currentSeasonRef.current;
    if (!activeSeason) throw new Error("No season selected");

    if (activeSeason.id === LOCAL_SEASON_ID || usingLocalFallbackRef.current) {
      const localDb = tributeData as HngrDB;
      save("hngr-db", localDb);
      setDbState(localDb);
      const game = {
        ...createLocalGame(localDb),
        name: name.trim(),
      };
      setSeasonGames([game]);
      setCurrentGameState(game);
      return game;
    }

    const response = await fetch(`/api/seasons/${activeSeason.id}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        tribute_data: tributeData,
        is_public: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create game (${response.status})`);
    }

    const game: Game = await response.json();
    await refreshGames();
    return game;
  }, [refreshGames]);

  const setCurrentGame = useCallback(async (game: Game | null) => {
    setCurrentGameState(game);
    const activeSeason = currentSeasonRef.current;
    if (!activeSeason) return;

    if (activeSeason.id === LOCAL_SEASON_ID || usingLocalFallbackRef.current) {
      return;
    }

    if (game) {
      const response = await fetch(`/api/seasons/${activeSeason.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_game_id: game.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set current game (${response.status})`);
      }
      await refreshGames();
    } else {
      const response = await fetch(`/api/seasons/${activeSeason.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_game_id: null }),
      });

      if (!response.ok) {
        throw new Error(`Failed to clear current game (${response.status})`);
      }
    }
  }, [refreshGames]);

  const saveDbToCurrentGame = useCallback(async () => {
    if (!dbState) return;

    save("hngr-db", dbState);

    if (!currentGame || currentGame.id === LOCAL_GAME_ID || usingLocalFallbackRef.current) {
      return;
    }

    const response = await fetch(`/api/games/${currentGame.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tribute_data: dbState,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save game (${response.status})`);
    }
  }, [dbState, currentGame]);

  const handleUpdateReferralName = useCallback((value: "tributes" | "volunteers" | "nominees") => {
    if (!dbState) return;
    const updated = updateReferralNameUtil(dbState, value);
    setDbState(updated);
    void saveDbToCurrentGame();
  }, [dbState, saveDbToCurrentGame]);

  const setDb = useCallback((newDb: HngrDB) => {
    setDbState(newDb);
    void saveDbToCurrentGame();
  }, [saveDbToCurrentGame]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      activateLocalFallback(loadLocalDb());
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      await refreshSeasons();
      setLoading(false);
    };

    void load();
  }, [isLoaded, isSignedIn, refreshSeasons, setCurrentSeason, activateLocalFallback]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (currentSeason && isSignedIn) {
      void refreshGames();
    } else {
      setSeasonGames([]);
      setCurrentGameState(null);
    }
  }, [currentSeason, isLoaded, isSignedIn, refreshGames]);

  useEffect(() => {
    if (seasons.length > 0 && !getCurrentSeasonId()) {
      setCurrentSeason(seasons[0]);
    }
  }, [seasons, setCurrentSeason]);

  return (
    <StateContext.Provider
      value={{
        db: dbState,
        setDb,
        updateReferralName: handleUpdateReferralName,
        saveDbToCurrentGame,
        seasons,
        currentSeason,
        setCurrentSeason,
        seasonGames,
        currentGame,
        setCurrentGame,
        refreshSeasons,
        createSeason,
        refreshGames,
        createGame,
      }}
    >
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error("useAppState must be used within a StateProvider");
  }
  return context;
}

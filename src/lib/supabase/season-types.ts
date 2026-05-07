export interface Season {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  current_game_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SeasonWithGames extends Season {
  game_count: number;
  has_current_game: boolean;
}

export interface CreateSeasonRequest {
  name: string;
  description?: string;
  status?: Season['status'];
}

export interface UpdateSeasonRequest {
  name?: string;
  description?: string;
  status?: Season['status'];
  current_game_id?: string;
}

export interface Game {
  id: string;
  owner_id: string;
  season_id?: string;
  name: string;
  tribute_data: any;
  game_number?: number;
  is_current?: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGameRequest {
  name: string;
  season_id?: string;
  tribute_data: any;
  game_number?: number;
  is_public?: boolean;
  owner_id?: string;
}

export interface UpdateGameRequest {
  name?: string;
  tribute_data?: any;
  is_current?: boolean;
  is_public?: boolean;
}

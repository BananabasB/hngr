export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      [_ in never]: never
    } & {
      users: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          username: string
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          created_at?: string | null
          updated_at?: string | null
          username: string
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
      }
      seasons: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          status: 'active' | 'completed' | 'archived'
          current_game_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          owner_id: string
          name: string
          description?: string | null
          status?: 'active' | 'completed' | 'archived' | null
          current_game_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string | null
          name?: string | null
          description?: string | null
          status?: 'active' | 'completed' | 'archived' | null
          current_game_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      games: {
        Row: {
          id: string
          owner_id: string
          season_id: string | null
          name: string
          tribute_data: Json
          game_number: number
          is_current: boolean
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          owner_id: string
          season_id?: string | null
          name: string
          tribute_data: Json
          game_number?: number | null
          is_current?: boolean | null
          is_public?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string | null
          season_id?: string | null
          name?: string | null
          tribute_data?: Json | null
          game_number?: number | null
          is_current?: boolean | null
          is_public?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    } & {
      seasons_with_games: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          status: 'active' | 'completed' | 'archived'
          current_game_id: string | null
          created_at: string
          updated_at: string
          game_count: number
          has_current_game: number
        }
        Insert: never
        Update: never
      }
    }
    Functions: {
      [_ in never]: never
    } & {
      set_current_game_for_season: {
        Args: {
          p_season_id: string
          p_game_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

-- Seasons Migration (Simplified Version)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
  current_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for seasons
CREATE INDEX IF NOT EXISTS idx_seasons_owner_id ON seasons(owner_id);
CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);

-- Add season_id to games table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'season_id') THEN
        ALTER TABLE games ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;
        ALTER TABLE games ADD COLUMN game_number INTEGER DEFAULT 1;
        ALTER TABLE games ADD COLUMN is_current BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_games_season_id ON games(season_id);
        CREATE INDEX IF NOT EXISTS idx_games_is_current ON games(is_current);
    END IF;
END $$;

-- Add season_id to nominations table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nominations' AND column_name = 'season_id') THEN
        ALTER TABLE nominations ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_nominations_season_id ON nominations(season_id);
    END IF;
END $$;

-- Add season_id to tributes table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tributes' AND column_name = 'season_id') THEN
        ALTER TABLE tributes ADD COLUMN season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_tributes_season_id ON tributes(season_id);
    END IF;
END $$;

-- Add trigger for updated_at on seasons (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_seasons_updated_at ON seasons;
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for seasons
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Seasons RLS policies
DROP POLICY IF EXISTS "Users can view their own seasons" ON seasons;
CREATE POLICY "Users can view their own seasons" ON seasons
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create their own seasons" ON seasons;
CREATE POLICY "Users can create their own seasons" ON seasons
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own seasons" ON seasons;
CREATE POLICY "Users can update their own seasons" ON seasons
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own seasons" ON seasons;
CREATE POLICY "Users can delete their own seasons" ON seasons
  FOR DELETE USING (auth.uid() = owner_id);

-- Function to set current game in season
CREATE OR REPLACE FUNCTION set_current_game_for_season(
  p_season_id UUID,
  p_game_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Update all games in season to not be current
  UPDATE games 
  SET is_current = false 
  WHERE season_id = p_season_id;
  
  -- Set the specified game as current
  UPDATE games 
  SET is_current = true 
  WHERE id = p_game_id AND season_id = p_season_id;
  
  -- Update season's current_game_id
  UPDATE seasons 
  SET current_game_id = p_game_id 
  WHERE id = p_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

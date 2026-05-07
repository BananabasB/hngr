-- Seasons Migration
-- Adds seasons functionality to allow users to manage multiple games simultaneously

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

-- Add season_id to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;

-- Add season_id to nominations table
ALTER TABLE nominations ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;

-- Add season_id to tributes table
ALTER TABLE tributes ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;

-- Update games table to add season context
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_number INTEGER DEFAULT 1;
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- Create index for season games
CREATE INDEX IF NOT EXISTS idx_games_season_id ON games(season_id);
CREATE INDEX IF NOT EXISTS idx_games_is_current ON games(is_current);

-- Create index for season nominations
CREATE INDEX IF NOT EXISTS idx_nominations_season_id ON nominations(season_id);

-- Create index for season tributes
CREATE INDEX IF NOT EXISTS idx_tributes_season_id ON tributes(season_id);

-- Add trigger for seasons updated_at
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to set current game in season
CREATE OR REPLACE FUNCTION set_current_game_in_season()
RETURNS TRIGGER AS $$
BEGIN
  -- When a game is marked as current, unmark all other games in the same season
  IF NEW.is_current = true AND OLD.is_current = false THEN
    UPDATE games 
    SET is_current = false 
    WHERE season_id = NEW.season_id AND id != NEW.id;
    
    -- Update the season's current_game_id
    UPDATE seasons 
    SET current_game_id = NEW.id 
    WHERE id = NEW.season_id;
  END IF;
  
  -- When a game is unmarked as current, clear the season's current_game_id if it was this game
  IF NEW.is_current = false AND OLD.is_current = true THEN
    UPDATE seasons 
    SET current_game_id = NULL 
    WHERE id = NEW.season_id AND current_game_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_current_game_trigger AFTER UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION set_current_game_in_season();

-- Row Level Security for seasons
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Seasons RLS policies
CREATE POLICY "Users can view their own seasons" ON seasons
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own seasons" ON seasons
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own seasons" ON seasons
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own seasons" ON seasons
  FOR DELETE USING (auth.uid() = owner_id);

-- Update existing games RLS policies to include season context
DROP POLICY IF EXISTS "Users can view their own games" ON games;
CREATE POLICY "Users can view their own games" ON games
  FOR SELECT USING (auth.uid() = owner_id OR (season_id IN (SELECT id FROM seasons WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS "Users can create their own games" ON games;
CREATE POLICY "Users can create their own games" ON games
  FOR INSERT WITH CHECK (auth.uid() = owner_id OR (season_id IN (SELECT id FROM seasons WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS "Users can update their own games" ON games;
CREATE POLICY "Users can update their own games" ON games
  FOR UPDATE USING (auth.uid() = owner_id OR (season_id IN (SELECT id FROM seasons WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS "Users can delete their own games" ON games;
CREATE POLICY "Users can delete their own games" ON games
  FOR DELETE USING (auth.uid() = owner_id OR (season_id IN (SELECT id FROM seasons WHERE owner_id = auth.uid())));

-- Helper view for seasons with games
CREATE OR REPLACE VIEW seasons_with_games AS
SELECT 
  s.*,
  COUNT(g.id) as game_count,
  COUNT(CASE WHEN g.is_current = true THEN 1 END) as has_current_game
FROM seasons s
LEFT JOIN games g ON s.id = g.season_id
GROUP BY s.id, s.owner_id, s.name, s.description, s.status, s.current_game_id, s.created_at, s.updated_at;

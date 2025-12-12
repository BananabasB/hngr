-- HNGR Nomination System Schema (Simplified for Clerk Auth)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced with Clerk)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Clerk user ID
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  is_plus BOOLEAN DEFAULT FALSE,
  plus_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friends/Relationships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create index for faster friendship lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Shared tributes (tributes that can be nominated)
CREATE TABLE IF NOT EXISTS tributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pronouns JSONB NOT NULL DEFAULT '{"subject": "they", "object": "them", "possessive": "their", "reflexive": "themselves"}',
  image_url TEXT,
  bio TEXT,
  is_public BOOLEAN DEFAULT false, -- Can be nominated by anyone
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for tribute lookups
CREATE INDEX IF NOT EXISTS idx_tributes_owner_id ON tributes(owner_id);
CREATE INDEX IF NOT EXISTS idx_tributes_is_public ON tributes(is_public);

-- Nominations table
CREATE TABLE IF NOT EXISTS nominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nominator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tribute_id UUID NOT NULL REFERENCES tributes(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')) DEFAULT 'pending',
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  CHECK (nominator_id != recipient_id)
);

-- Create indexes for nomination queries
CREATE INDEX IF NOT EXISTS idx_nominations_nominator_id ON nominations(nominator_id);
CREATE INDEX IF NOT EXISTS idx_nominations_recipient_id ON nominations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_nominations_tribute_id ON nominations(tribute_id);
CREATE INDEX IF NOT EXISTS idx_nominations_status ON nominations(status);

-- Nomination votes (for voting system)
CREATE TABLE IF NOT EXISTS nomination_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomination_id UUID NOT NULL REFERENCES nominations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nomination_id, user_id)
);

-- Create index for vote lookups
CREATE INDEX IF NOT EXISTS idx_nomination_votes_nomination_id ON nomination_votes(nomination_id);
CREATE INDEX IF NOT EXISTS idx_nomination_votes_user_id ON nomination_votes(user_id);

-- User games (to track which tributes are in which games)
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tribute_data JSONB NOT NULL, -- Full game state from localStorage
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for game lookups
CREATE INDEX IF NOT EXISTS idx_games_owner_id ON games(owner_id);

-- Game tributes junction table (which tributes are in which games)
CREATE TABLE IF NOT EXISTS game_tributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  tribute_id UUID REFERENCES tributes(id) ON DELETE SET NULL, -- NULL if custom tribute
  district INTEGER NOT NULL CHECK (district >= 1 AND district <= 12),
  position INTEGER NOT NULL CHECK (position IN (1, 2)), -- Position 1 or 2 in district
  custom_tribute_data JSONB, -- For tributes not in tributes table
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, district, position)
);

-- Create index for game tribute lookups
CREATE INDEX IF NOT EXISTS idx_game_tributes_game_id ON game_tributes(game_id);
CREATE INDEX IF NOT EXISTS idx_game_tributes_tribute_id ON game_tributes(tribute_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'nomination_received', 'nomination_accepted', 'nomination_rejected', 'nomination_vote')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tributes_updated_at ON tributes;
CREATE TRIGGER update_tributes_updated_at BEFORE UPDATE ON tributes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nominations_updated_at ON nominations;
CREATE TRIGGER update_nominations_updated_at BEFORE UPDATE ON nominations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-accept friendship bidirectionally
CREATE OR REPLACE FUNCTION create_bidirectional_friendship()
RETURNS TRIGGER AS $$
BEGIN
  -- When a friendship is accepted, create the reverse relationship if it doesn't exist
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO friendships (user_id, friend_id, status, accepted_at)
    VALUES (NEW.friend_id, NEW.user_id, 'accepted', NEW.accepted_at)
    ON CONFLICT (user_id, friend_id) DO UPDATE
    SET status = 'accepted', accepted_at = NEW.accepted_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bidirectional_friendship ON friendships;
CREATE TRIGGER bidirectional_friendship AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION create_bidirectional_friendship();

-- Function to increment nomination votes
CREATE OR REPLACE FUNCTION increment_nomination_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE nominations
  SET votes = votes + 1
  WHERE id = NEW.nomination_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_votes ON nomination_votes;
CREATE TRIGGER increment_votes AFTER INSERT ON nomination_votes
  FOR EACH ROW EXECUTE FUNCTION increment_nomination_votes();

-- Function to decrement nomination votes
CREATE OR REPLACE FUNCTION decrement_nomination_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE nominations
  SET votes = votes - 1
  WHERE id = OLD.nomination_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decrement_votes ON nomination_votes;
CREATE TRIGGER decrement_votes AFTER DELETE ON nomination_votes
  FOR EACH ROW EXECUTE FUNCTION decrement_nomination_votes();

-- Row Level Security (RLS) Policies
-- IMPORTANT: Since we're using Clerk for authentication (not Supabase Auth),
-- we use permissive policies. Security is enforced at the application layer.
-- For production, consider implementing Supabase JWT integration with Clerk.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomination_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_tributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friend requests" ON friendships;
DROP POLICY IF EXISTS "Users can update their received friend requests" ON friendships;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON friendships;
DROP POLICY IF EXISTS "Public tributes are viewable by everyone" ON tributes;
DROP POLICY IF EXISTS "Users can view their own tributes" ON tributes;
DROP POLICY IF EXISTS "Users can view friends' tributes" ON tributes;
DROP POLICY IF EXISTS "Users can create their own tributes" ON tributes;
DROP POLICY IF EXISTS "Users can update their own tributes" ON tributes;
DROP POLICY IF EXISTS "Users can delete their own tributes" ON tributes;
DROP POLICY IF EXISTS "Users can view nominations they created" ON nominations;
DROP POLICY IF EXISTS "Users can view nominations they received" ON nominations;
DROP POLICY IF EXISTS "Users can create nominations to friends" ON nominations;
DROP POLICY IF EXISTS "Recipients can update nomination status" ON nominations;
DROP POLICY IF EXISTS "Nominators can delete their nominations" ON nominations;
DROP POLICY IF EXISTS "Users can view votes on nominations they can see" ON nomination_votes;
DROP POLICY IF EXISTS "Users can vote on nominations" ON nomination_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON nomination_votes;
DROP POLICY IF EXISTS "Public games are viewable by everyone" ON games;
DROP POLICY IF EXISTS "Users can view their own games" ON games;
DROP POLICY IF EXISTS "Users can create their own games" ON games;
DROP POLICY IF EXISTS "Users can update their own games" ON games;
DROP POLICY IF EXISTS "Users can delete their own games" ON games;
DROP POLICY IF EXISTS "Users can view game tributes for games they can see" ON game_tributes;
DROP POLICY IF EXISTS "Users can manage their game tributes" ON game_tributes;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Permissive policies (security handled by Clerk + application logic)
CREATE POLICY "Enable all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for friendships" ON friendships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for tributes" ON tributes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for nominations" ON nominations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for nomination_votes" ON nomination_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for game_tributes" ON game_tributes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Helper views for common queries
DROP VIEW IF EXISTS user_friends;
CREATE OR REPLACE VIEW user_friends AS
SELECT
  f.user_id,
  u.id as friend_id,
  u.username as friend_username,
  u.display_name as friend_display_name,
  u.avatar_url as friend_avatar_url,
  f.status,
  f.requested_at,
  f.accepted_at
FROM friendships f
JOIN users u ON f.friend_id = u.id
WHERE f.status = 'accepted';

DROP VIEW IF EXISTS pending_nominations;
CREATE OR REPLACE VIEW pending_nominations AS
SELECT
  n.*,
  u1.username as nominator_username,
  u1.display_name as nominator_display_name,
  u2.username as recipient_username,
  u2.display_name as recipient_display_name,
  t.name as tribute_name,
  t.image_url as tribute_image_url
FROM nominations n
JOIN users u1 ON n.nominator_id = u1.id
JOIN users u2 ON n.recipient_id = u2.id
JOIN tributes t ON n.tribute_id = t.id
WHERE n.status = 'pending';

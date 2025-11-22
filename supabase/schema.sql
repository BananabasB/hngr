-- HNGR Nomination System Schema
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
-- Nominations now contain tribute info directly (provided by nominator)
-- This makes nominations self-contained polls that don't require a tribute to exist
CREATE TABLE IF NOT EXISTS nominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nominator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tribute_name TEXT NOT NULL,
  tribute_pronouns JSONB NOT NULL DEFAULT '{"subject": "they", "object": "them", "possessive": "their", "reflexive": "themselves"}',
  tribute_image_url TEXT,
  tribute_bio TEXT,
  message TEXT,
  income INTEGER, -- Income level for district suggestion/AI context
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'hidden')) DEFAULT 'pending',
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  CHECK (nominator_id != recipient_id)
);

-- Create indexes for nomination queries
CREATE INDEX IF NOT EXISTS idx_nominations_nominator_id ON nominations(nominator_id);
CREATE INDEX IF NOT EXISTS idx_nominations_recipient_id ON nominations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_nominations_status ON nominations(status);

-- Nomination votes (for voting system)
CREATE TABLE IF NOT EXISTS nomination_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomination_id UUID NOT NULL REFERENCES nominations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nomination_id, user_id)
);

-- Nomination reports (for community moderation)
CREATE TABLE IF NOT EXISTS nomination_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomination_id UUID NOT NULL REFERENCES nominations(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate_content', 'harassment', 'spam', 'offensive', 'other')),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nomination_id, reporter_id)
);

-- Create index for vote lookups
CREATE INDEX IF NOT EXISTS idx_nomination_votes_nomination_id ON nomination_votes(nomination_id);
CREATE INDEX IF NOT EXISTS idx_nomination_votes_user_id ON nomination_votes(user_id);

-- Create index for report lookups
CREATE INDEX IF NOT EXISTS idx_nomination_reports_nomination_id ON nomination_reports(nomination_id);
CREATE INDEX IF NOT EXISTS idx_nomination_reports_reporter_id ON nomination_reports(reporter_id);

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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tributes_updated_at BEFORE UPDATE ON tributes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nominations_updated_at BEFORE UPDATE ON nominations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER decrement_votes AFTER DELETE ON nomination_votes
  FOR EACH ROW EXECUTE FUNCTION decrement_nomination_votes();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomination_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomination_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_tributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: Anyone can read, users can update their own profile
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Friendships: Users can manage their own friendships
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their received friend requests" ON friendships
  FOR UPDATE USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Tributes: Owner can manage, friends can view, public tributes viewable by all
CREATE POLICY "Public tributes are viewable by everyone" ON tributes
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own tributes" ON tributes
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view friends' tributes" ON tributes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_id = auth.uid() AND friend_id = owner_id AND status = 'accepted')
    )
  );

CREATE POLICY "Users can create their own tributes" ON tributes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own tributes" ON tributes
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own tributes" ON tributes
  FOR DELETE USING (auth.uid() = owner_id);

-- Nominations: Nominator and recipient can view
CREATE POLICY "Users can view nominations they created" ON nominations
  FOR SELECT USING (auth.uid() = nominator_id);

CREATE POLICY "Users can view nominations they received" ON nominations
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can create nominations to friends" ON nominations
  FOR INSERT WITH CHECK (
    auth.uid() = nominator_id
  );

CREATE POLICY "Recipients can update nomination status" ON nominations
  FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Nominators can delete their nominations" ON nominations
  FOR DELETE USING (auth.uid() = nominator_id);

-- Nomination votes: Users can vote on nominations they can see
CREATE POLICY "Users can view votes on nominations they can see" ON nomination_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nominations
      WHERE id = nomination_id AND (nominator_id = auth.uid() OR recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can vote on nominations" ON nomination_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON nomination_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Nomination reports: Users can report nominations they can see, view reports on their own nominations
CREATE POLICY "Users can view reports on their nominations" ON nomination_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nominations
      WHERE id = nomination_id AND (nominator_id = auth.uid() OR recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can report nominations they can see" ON nomination_reports
  FOR INSERT WITH CHECK (
    auth.uid() = reporter_id AND
    EXISTS (
      SELECT 1 FROM nominations
      WHERE id = nomination_id AND (nominator_id = auth.uid() OR recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own reports" ON nomination_reports
  FOR DELETE USING (auth.uid() = reporter_id);

-- Games: Owner can manage, public games viewable by all
CREATE POLICY "Public games are viewable by everyone" ON games
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own games" ON games
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own games" ON games
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own games" ON games
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own games" ON games
  FOR DELETE USING (auth.uid() = owner_id);

-- Game tributes: Follow game permissions
CREATE POLICY "Users can view game tributes for games they can see" ON game_tributes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE id = game_id AND (owner_id = auth.uid() OR is_public = true)
    )
  );

CREATE POLICY "Users can manage their game tributes" ON game_tributes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE id = game_id AND owner_id = auth.uid()
    )
  );

-- Notifications: Users can only see their own
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Helper views for common queries
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

CREATE OR REPLACE VIEW pending_nominations AS
SELECT
  n.*,
  u1.username as nominator_username,
  u1.display_name as nominator_display_name,
  u2.username as recipient_username,
  u2.display_name as recipient_display_name
FROM nominations n
JOIN users u1 ON n.nominator_id = u1.id
JOIN users u2 ON n.recipient_id = u2.id
WHERE n.status = 'pending';

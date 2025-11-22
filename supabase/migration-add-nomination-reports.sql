-- Add nomination reports table for community moderation
-- Run this in your Supabase SQL Editor

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

-- Create index for report lookups
CREATE INDEX IF NOT EXISTS idx_nomination_reports_nomination_id ON nomination_reports(nomination_id);
CREATE INDEX IF NOT EXISTS idx_nomination_reports_reporter_id ON nomination_reports(reporter_id);

-- Enable RLS
ALTER TABLE nomination_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view reports on their nominations" ON nomination_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nominations
      WHERE id = nomination_reports.nomination_id AND (nominator_id = auth.uid()::text OR recipient_id = auth.uid()::text)
    )
  );

CREATE POLICY "Users can report nominations they can see" ON nomination_reports
  FOR INSERT WITH CHECK (
    auth.uid()::text = reporter_id AND
    EXISTS (
      SELECT 1 FROM nominations
      WHERE id = nomination_reports.nomination_id AND (nominator_id = auth.uid()::text OR recipient_id = auth.uid()::text)
    )
  );

CREATE POLICY "Users can delete their own reports" ON nomination_reports
  FOR DELETE USING (auth.uid()::text = reporter_id);

-- Update nomination status constraint to include 'hidden'
ALTER TABLE nominations DROP CONSTRAINT nominations_status_check;
ALTER TABLE nominations ADD CONSTRAINT nominations_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'hidden'));

-- Function to automatically hide nominations with too many reports
CREATE OR REPLACE FUNCTION auto_hide_reported_nominations()
RETURNS TRIGGER AS $$
BEGIN
  -- Count reports for this nomination
  IF (SELECT COUNT(*) FROM nomination_reports WHERE nomination_id = NEW.nomination_id) >= 3 THEN
    -- Hide the nomination if it has 3 or more reports
    UPDATE nominations SET status = 'hidden' WHERE id = NEW.nomination_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-hide nominations
CREATE TRIGGER auto_hide_on_report
  AFTER INSERT ON nomination_reports
  FOR EACH ROW EXECUTE FUNCTION auto_hide_reported_nominations();

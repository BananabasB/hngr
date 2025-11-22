-- Migration: Remove tribute_id from nominations and add tribute fields directly
-- This allows nominations to be self-contained with tribute info provided by nominators

-- Step 1: Add new columns for tribute data
ALTER TABLE nominations
  ADD COLUMN IF NOT EXISTS tribute_name TEXT,
  ADD COLUMN IF NOT EXISTS tribute_pronouns JSONB,
  ADD COLUMN IF NOT EXISTS tribute_image_url TEXT,
  ADD COLUMN IF NOT EXISTS tribute_bio TEXT;

-- Step 2: Migrate existing data (copy from tributes table)
UPDATE nominations n
SET 
  tribute_name = t.name,
  tribute_pronouns = t.pronouns,
  tribute_image_url = t.image_url,
  tribute_bio = t.bio
FROM tributes t
WHERE n.tribute_id = t.id;

-- Step 3: Make new columns NOT NULL (after migration)
ALTER TABLE nominations
  ALTER COLUMN tribute_name SET NOT NULL,
  ALTER COLUMN tribute_pronouns SET NOT NULL;

-- Step 4: Drop the foreign key constraint and column
ALTER TABLE nominations
  DROP CONSTRAINT IF EXISTS nominations_tribute_id_fkey,
  DROP COLUMN IF EXISTS tribute_id;

-- Step 5: Drop the index on tribute_id
DROP INDEX IF EXISTS idx_nominations_tribute_id;

-- Step 6: Update the view that references tribute_id
DROP VIEW IF EXISTS pending_nominations;

CREATE OR REPLACE VIEW pending_nominations AS
SELECT
  n.*,
  u1.username as nominator_username,
  u1.display_name as nominator_display_name,
  u2.username as recipient_username,
  u2.display_name as recipient_display_name,
  n.tribute_name,
  n.tribute_image_url as tribute_image_url
FROM nominations n
JOIN users u1 ON n.nominator_id = u1.id
JOIN users u2 ON n.recipient_id = u2.id
WHERE n.status = 'pending';


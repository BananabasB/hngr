-- Migration: Add income column to nominations table
-- Run this in your Supabase SQL Editor to add the income column

ALTER TABLE nominations ADD COLUMN income INTEGER;

-- Optional: Add a comment to document the column purpose
COMMENT ON COLUMN nominations.income IS 'Income level for district suggestion and AI context';

-- Test query to verify seasons setup
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('seasons', 'games', 'nominations', 'tributes')
  AND column_name LIKE '%season%'
ORDER BY table_name, ordinal_position;

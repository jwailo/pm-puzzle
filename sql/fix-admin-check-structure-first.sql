-- First, let's check what columns actually exist in the game_sessions table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'game_sessions'
ORDER BY ordinal_position;
-- DIAGNOSE: Find where puzzle completions are actually stored

-- 1. List all tables that might contain completion data
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name LIKE '%complet%'
    OR table_name LIKE '%puzzle%'
    OR table_name LIKE '%daily%'
    OR table_name LIKE '%leader%'
    OR table_name LIKE '%game%'
    OR table_name LIKE '%session%'
)
ORDER BY table_name;

-- 2. Check what the CURRENT get_public_daily_leaderboard function looks like
SELECT
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_public_daily_leaderboard';

-- 3. Check if there's a daily_completions table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'daily_completions'
ORDER BY ordinal_position;

-- 4. Check if there's a game_sessions table with completion data
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'game_sessions'
ORDER BY ordinal_position;

-- 5. Look for any table with 'time_seconds' column (used in the leaderboard)
SELECT DISTINCT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'time_seconds';

-- 6. Look for any table with 'puzzle_date' column
SELECT DISTINCT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'puzzle_date';

-- 7. Check what record_puzzle_completion function does (it must store somewhere)
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'record_puzzle_completion';
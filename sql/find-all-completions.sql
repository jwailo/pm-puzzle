-- FIND WHERE ALL COMPLETIONS ARE STORED (not just top 10)

-- 1. Check what tables exist that might store completion data
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name LIKE '%complet%'
    OR table_name LIKE '%puzzle%'
    OR table_name LIKE '%daily%'
    OR table_name LIKE '%play%'
    OR table_name LIKE '%session%'
)
ORDER BY table_name;

-- 2. Check if there's a puzzle_completions or daily_completions table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('puzzle_completions', 'daily_completions', 'daily_puzzle_completions')
ORDER BY table_name, ordinal_position;

-- 3. Check what the record_puzzle_completion function does
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'record_puzzle_completion';

-- 4. Look for any function that gets ALL completions (not limited)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%complet%'
    OR routine_name LIKE '%all%'
    OR routine_name LIKE '%daily%'
)
ORDER BY routine_name;

-- 5. Check if user_stats tracks daily play dates
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_stats'
ORDER BY ordinal_position;

-- 6. Check if there's a way to get all users who played on a specific date
-- This might be through user_stats or another tracking table
SELECT
    COUNT(DISTINCT user_id) as unique_players_today
FROM user_stats
WHERE DATE(last_completed) = '2025-10-23'
    OR DATE(updated_at) = '2025-10-23';

-- 7. Try to find the actual storage table for daily completions
-- The game must store this somewhere since it tracks who completed each day
SELECT
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name IN ('puzzle_date', 'completion_date', 'completed_at', 'play_date')
ORDER BY table_name;
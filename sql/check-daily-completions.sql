-- CHECK WHAT DAILY COMPLETION DATA EXISTS

-- 1. Check if get_public_daily_leaderboard function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_public_daily_leaderboard';

-- 2. Check if there's a daily_completions or puzzle_completions table
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE '%completion%' OR table_name LIKE '%puzzle%' OR table_name LIKE '%daily%')
ORDER BY table_name;

-- 3. Test the get_public_daily_leaderboard function for today
SELECT * FROM get_public_daily_leaderboard('2025-10-23') LIMIT 10;

-- 4. Check what record_puzzle_completion does
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'record_puzzle_completion';

-- 5. Try to get all completions by date
-- This might show us the table structure
SELECT
    '2025-10-23' as date,
    COUNT(*) as completions_today
FROM get_public_daily_leaderboard('2025-10-23');

SELECT
    '2025-10-22' as date,
    COUNT(*) as completions_yesterday
FROM get_public_daily_leaderboard('2025-10-22');

-- 6. Look for the actual table where completions are stored
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND (column_name LIKE '%completion%' OR column_name LIKE '%puzzle%')
ORDER BY table_name, ordinal_position;
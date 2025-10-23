-- FIND WHERE DAILY COMPLETIONS ARE STORED

-- 1. List all tables that might have completion data
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name LIKE '%complet%'
    OR table_name LIKE '%daily%'
    OR table_name LIKE '%quick%'
    OR table_name LIKE '%time%'
    OR table_name LIKE '%leader%'
)
ORDER BY table_name;

-- 2. List all functions that might return completion data
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%complet%'
    OR routine_name LIKE '%daily%'
    OR routine_name LIKE '%quick%'
    OR routine_name LIKE '%leader%'
    OR routine_name LIKE '%time%'
)
ORDER BY routine_name;

-- 3. Check if there's a daily_completions table
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'daily_completions'
) as daily_completions_exists;

-- 4. Check if there's a puzzle_completions table
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'puzzle_completions'
) as puzzle_completions_exists;

-- 5. Check user_stats to see what we can work with
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY ordinal_position;

-- 6. See if we can get daily activity from user_stats
SELECT
    DATE(updated_at) as play_date,
    COUNT(*) as players,
    STRING_AGG(user_id::text, ', ') as user_ids
FROM user_stats
WHERE games_played > 0
GROUP BY DATE(updated_at)
ORDER BY play_date DESC
LIMIT 10;
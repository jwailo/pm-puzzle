-- FIND DAILY COMPLETIONS FROM EXISTING DATA
-- The game is working and storing data, we just need to find it

-- 1. Check user_stats structure and data
SELECT '=== 1. User stats sample ===' as info;
SELECT
    user_id,
    games_played,
    games_won,
    current_streak,
    longest_streak,
    last_played,
    last_completed,
    created_at,
    updated_at
FROM user_stats
WHERE games_won > 0
ORDER BY last_played DESC
LIMIT 10;

-- 2. Check if last_played shows daily activity
SELECT '=== 2. Daily activity from user_stats ===' as info;
SELECT
    DATE(last_played) as play_date,
    COUNT(*) as players_that_day,
    STRING_AGG(SUBSTRING(user_id::text, 1, 8), ', ') as user_ids_sample
FROM user_stats
WHERE last_played IS NOT NULL
GROUP BY DATE(last_played)
ORDER BY play_date DESC
LIMIT 30;

-- 3. Check if there's a daily_completions or puzzle_completions table
SELECT '=== 3. Tables that might have completions ===' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name LIKE '%complet%'
    OR table_name LIKE '%puzzle%'
    OR table_name LIKE '%daily%'
    OR table_name LIKE '%game%'
    OR table_name LIKE '%play%'
)
ORDER BY table_name;

-- 4. Check user_profiles for the actual user names
SELECT '=== 4. User profiles with game stats ===' as info;
SELECT
    up.id,
    up.first_name,
    up.email,
    us.games_played,
    us.games_won,
    us.last_played,
    us.current_streak
FROM user_profiles up
LEFT JOIN user_stats us ON up.id = us.user_id
WHERE us.games_won > 0
ORDER BY us.last_played DESC
LIMIT 20;

-- 5. Create a view of daily completions from user_stats
SELECT '=== 5. Daily completions constructed from user_stats ===' as info;
WITH daily_plays AS (
    SELECT
        DATE(us.last_played) as completion_date,
        us.user_id,
        up.first_name,
        up.email,
        us.games_won,
        us.games_played,
        us.last_played as completed_at
    FROM user_stats us
    LEFT JOIN user_profiles up ON us.user_id = up.id
    WHERE us.last_played IS NOT NULL
        AND us.games_played > 0
)
SELECT
    completion_date,
    COUNT(*) as total_completions,
    STRING_AGG(
        COALESCE(first_name, 'Guest') || ' (' || COALESCE(email, 'No email') || ')',
        ', ' ORDER BY first_name
    ) as players
FROM daily_plays
GROUP BY completion_date
ORDER BY completion_date DESC
LIMIT 15;

-- 6. Check if there's any table tracking daily puzzle data
SELECT '=== 6. All tables with row counts ===' as info;
SELECT
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 7. Final check - what exactly is in user_stats that we can use
SELECT '=== 7. User stats columns ===' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY ordinal_position;

-- 8. THE KEY: If last_played = today, they completed today's puzzle
SELECT '=== 8. Today''s completions ===' as info;
SELECT
    up.first_name,
    up.email,
    us.last_played,
    us.games_won,
    us.current_streak
FROM user_stats us
JOIN user_profiles up ON us.user_id = up.id
WHERE DATE(us.last_played) = CURRENT_DATE
ORDER BY us.last_played DESC;
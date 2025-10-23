-- DIAGNOSE WHY COMPLETIONS RETURN 0
-- Let's check step by step what's in the database

-- 1. Check if game_sessions table has any data at all
SELECT '=== 1. Total game sessions ===' as step;
SELECT COUNT(*) as total_sessions FROM game_sessions;

-- 2. Check how many games were won
SELECT '=== 2. Games won ===' as step;
SELECT
    COUNT(*) as total_games,
    SUM(CASE WHEN game_won = true THEN 1 ELSE 0 END) as games_won,
    SUM(CASE WHEN game_won = false THEN 1 ELSE 0 END) as games_lost,
    SUM(CASE WHEN game_won IS NULL THEN 1 ELSE 0 END) as games_null
FROM game_sessions;

-- 3. Check user_id distribution
SELECT '=== 3. User ID check ===' as step;
SELECT
    COUNT(*) as total_sessions,
    SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as with_user_id,
    SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as without_user_id
FROM game_sessions
WHERE game_won = true;

-- 4. Show sample of ALL winning games (including those without user_id)
SELECT '=== 4. Sample of ALL winning games ===' as step;
SELECT
    id,
    session_id,
    user_id,
    game_won,
    current_row,
    date,
    created_at,
    updated_at
FROM game_sessions
WHERE game_won = true
LIMIT 20;

-- 5. Check if the issue is the user_id filter
SELECT '=== 5. Winning games by user_id status ===' as step;
SELECT
    CASE
        WHEN user_id IS NULL THEN 'Guest/Anonymous'
        ELSE 'Registered User'
    END as user_type,
    COUNT(*) as win_count
FROM game_sessions
WHERE game_won = true
GROUP BY CASE WHEN user_id IS NULL THEN 'Guest/Anonymous' ELSE 'Registered User' END;

-- 6. Check if user_profiles table has matching users
SELECT '=== 6. User profiles check ===' as step;
SELECT
    COUNT(DISTINCT gs.user_id) as unique_winners_in_sessions,
    COUNT(DISTINCT up.id) as matching_user_profiles
FROM game_sessions gs
LEFT JOIN user_profiles up ON gs.user_id = up.id
WHERE gs.game_won = true AND gs.user_id IS NOT NULL;

-- 7. Show winning sessions WITH user profiles
SELECT '=== 7. Winning sessions with user data ===' as step;
SELECT
    gs.id,
    gs.user_id,
    up.email,
    up.first_name,
    gs.game_won,
    gs.date,
    gs.created_at
FROM game_sessions gs
LEFT JOIN user_profiles up ON gs.user_id = up.id
WHERE gs.game_won = true
    AND gs.user_id IS NOT NULL
LIMIT 20;

-- 8. Try the function without the user_id filter to see if we get data
SELECT '=== 8. Function test WITHOUT user_id filter ===' as step;

DROP FUNCTION IF EXISTS get_all_completions_no_filter();
CREATE OR REPLACE FUNCTION get_all_completions_no_filter()
RETURNS TABLE (
    completion_date DATE,
    user_id UUID,
    session_id TEXT,
    game_won BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
AS $$
    SELECT
        COALESCE(date, created_at::DATE) as completion_date,
        user_id,
        session_id,
        game_won,
        created_at
    FROM game_sessions
    WHERE game_won = true
    ORDER BY created_at DESC;
$$;

SELECT COUNT(*) as total_wins_no_filter FROM get_all_completions_no_filter();
SELECT * FROM get_all_completions_no_filter() LIMIT 10;

-- 9. Check if it's a boolean type issue
SELECT '=== 9. Check game_won values ===' as step;
SELECT DISTINCT game_won, COUNT(*)
FROM game_sessions
GROUP BY game_won
ORDER BY game_won;

-- 10. Raw query to see what we're working with
SELECT '=== 10. Raw data sample ===' as step;
SELECT * FROM game_sessions
ORDER BY created_at DESC
LIMIT 10;
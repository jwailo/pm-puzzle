-- REAL PLAYER AND GAME COUNT ANALYSIS (FIXED)
-- Red Team Investigation of Analytics Discrepancy

-- 1. How many REAL registered users exist?
SELECT COUNT(DISTINCT id) as registered_users
FROM user_profiles;

-- 2. How many of those registered users have actually played?
SELECT COUNT(DISTINCT user_id) as users_who_played
FROM user_stats
WHERE games_played > 0;

-- 3. What's the TOTAL games played by registered users?
SELECT
    COUNT(DISTINCT user_id) as unique_players,
    SUM(games_played) as total_games_by_registered,
    AVG(games_played)::DECIMAL(10,2) as avg_games_per_user,
    MAX(games_played) as max_games_by_one_user
FROM user_stats;

-- 4. Check for guest sessions in user_stats (should be none or few)
SELECT
    COUNT(*) as total_rows,
    COUNT(DISTINCT user_id) as unique_user_ids,
    COUNT(DISTINCT session_id) as unique_session_ids,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_ids,
    COUNT(CASE WHEN session_id IS NOT NULL AND user_id IS NULL THEN 1 END) as guest_sessions
FROM user_stats;

-- 5. Check game_sessions table (might be empty or have different data)
SELECT
    COUNT(*) as total_sessions,
    COUNT(DISTINCT user_id) as unique_users_in_sessions,
    COUNT(DISTINCT session_id) as unique_session_ids,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as guest_sessions,
    COUNT(CASE WHEN game_won = true THEN 1 END) as games_won
FROM game_sessions;

-- 6. Get the REAL unique player count (FIXED - converting to text)
WITH all_players AS (
    -- Registered users who have played
    SELECT DISTINCT user_id::TEXT as player_id, 'registered' as player_type
    FROM user_stats
    WHERE user_id IS NOT NULL AND games_played > 0

    UNION

    -- Guest sessions from user_stats (if any)
    SELECT DISTINCT session_id as player_id, 'guest' as player_type
    FROM user_stats
    WHERE user_id IS NULL AND session_id IS NOT NULL

    UNION

    -- Guest sessions from game_sessions (if any)
    SELECT DISTINCT session_id as player_id, 'guest_session' as player_type
    FROM game_sessions
    WHERE user_id IS NULL AND session_id IS NOT NULL
)
SELECT
    COUNT(DISTINCT player_id) as true_unique_players,
    COUNT(CASE WHEN player_type = 'registered' THEN 1 END) as registered_players,
    COUNT(CASE WHEN player_type IN ('guest', 'guest_session') THEN 1 END) as guest_players
FROM all_players;

-- 7. Daily completions - the actual games completed
SELECT
    COUNT(*) as total_completions,
    COUNT(DISTINCT user_id) as unique_users_completed,
    COUNT(DISTINCT puzzle_date) as days_with_completions,
    MIN(puzzle_date) as first_completion,
    MAX(puzzle_date) as last_completion
FROM daily_completions;

-- 8. The TRUTH - How many people have actually PLAYED the game?
SELECT
    'Registered Users Who Played' as category,
    COUNT(DISTINCT user_id) as count
FROM user_stats
WHERE games_played > 0

UNION ALL

SELECT
    'Total Games Played (Registered)' as category,
    SUM(games_played) as count
FROM user_stats

UNION ALL

SELECT
    'Daily Completions (Actual Puzzles Solved)' as category,
    COUNT(*) as count
FROM daily_completions

UNION ALL

SELECT
    'Unique Days with Activity' as category,
    COUNT(DISTINCT puzzle_date) as count
FROM daily_completions;

-- 9. BONUS: Check if user_profiles count matches users with stats
WITH profile_stats_comparison AS (
    SELECT
        'Users in user_profiles' as description,
        COUNT(*) as count
    FROM user_profiles

    UNION ALL

    SELECT
        'Users in user_stats' as description,
        COUNT(DISTINCT user_id) as count
    FROM user_stats
    WHERE user_id IS NOT NULL

    UNION ALL

    SELECT
        'Users with games > 0' as description,
        COUNT(DISTINCT user_id) as count
    FROM user_stats
    WHERE games_played > 0
)
SELECT * FROM profile_stats_comparison
ORDER BY count DESC;

-- 10. Find discrepancies - users in profiles but not in stats
SELECT COUNT(*) as users_without_stats
FROM user_profiles up
LEFT JOIN user_stats us ON up.id = us.user_id
WHERE us.user_id IS NULL;

-- 11. The smoking gun - what's inflating the count?
SELECT
    'Registered users in profiles' as source,
    COUNT(*) as count
FROM user_profiles

UNION ALL

SELECT
    'Session IDs in user_stats (guests)' as source,
    COUNT(DISTINCT session_id) as count
FROM user_stats
WHERE user_id IS NULL AND session_id IS NOT NULL

UNION ALL

SELECT
    'Session IDs in game_sessions (guests)' as source,
    COUNT(DISTINCT session_id) as count
FROM game_sessions
WHERE user_id IS NULL AND session_id IS NOT NULL

ORDER BY count DESC;
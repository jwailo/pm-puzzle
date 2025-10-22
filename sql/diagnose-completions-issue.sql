-- Diagnostic queries to understand the completions issue

-- 1. Check what data we have in game_sessions
SELECT
    'Total game_sessions' as metric,
    COUNT(*) as count
FROM game_sessions
UNION ALL
SELECT
    'Sessions where game_won = true',
    COUNT(*)
FROM game_sessions
WHERE game_won = true
UNION ALL
SELECT
    'Sessions with user_id (registered users)',
    COUNT(*)
FROM game_sessions
WHERE user_id IS NOT NULL
UNION ALL
SELECT
    'Winning sessions by registered users',
    COUNT(*)
FROM game_sessions
WHERE game_won = true AND user_id IS NOT NULL;

-- 2. Check date distribution
SELECT
    date,
    COUNT(*) as total_sessions,
    SUM(CASE WHEN game_won = true THEN 1 ELSE 0 END) as won_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(CASE WHEN game_won = true AND user_id IS NOT NULL THEN 1 ELSE 0 END) as registered_winners
FROM game_sessions
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- 3. Check what get_daily_puzzle_completions returns
SELECT COUNT(*) as total_rows
FROM get_daily_puzzle_completions();

-- 4. Sample of actual completions
SELECT *
FROM get_daily_puzzle_completions()
ORDER BY completion_date DESC, completed_at ASC
LIMIT 50;

-- 5. Check for users who have completed multiple days
SELECT
    email,
    first_name,
    COUNT(DISTINCT completion_date) as days_completed,
    COUNT(*) as total_completions,
    ARRAY_AGG(DISTINCT completion_date ORDER BY completion_date DESC) as dates_played
FROM get_daily_puzzle_completions()
GROUP BY email, first_name
HAVING COUNT(DISTINCT completion_date) > 1
ORDER BY days_completed DESC
LIMIT 20;

-- 6. Check if there are any data issues with the join
SELECT
    'Users in profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT
    'Unique user_ids in winning game_sessions',
    COUNT(DISTINCT user_id)
FROM game_sessions
WHERE game_won = true AND user_id IS NOT NULL
UNION ALL
SELECT
    'Users with no profile but have won games',
    COUNT(DISTINCT gs.user_id)
FROM game_sessions gs
LEFT JOIN user_profiles up ON gs.user_id = up.id
WHERE gs.game_won = true
    AND gs.user_id IS NOT NULL
    AND up.id IS NULL;
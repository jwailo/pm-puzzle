-- Test query to identify the discrepancy between signed up users and completions
-- This will help identify users who have completed games but don't show in the users list

-- 1. Check the structure of user_profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('id', 'user_id', 'email');

-- 2. Find users who have completed games but might not be showing in admin users list
-- These are users in game_sessions but potentially missing from the users list
WITH game_completers AS (
    SELECT DISTINCT gs.user_id, COUNT(*) as games_completed
    FROM game_sessions gs
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL
    GROUP BY gs.user_id
),
profile_users AS (
    SELECT id, email, first_name
    FROM user_profiles
),
stats_users AS (
    SELECT user_id, games_won
    FROM user_stats
    WHERE user_id IS NOT NULL
)
SELECT
    pu.email,
    pu.first_name,
    gc.games_completed as completions_in_game_sessions,
    su.games_won as games_won_in_stats,
    CASE
        WHEN su.user_id IS NULL THEN 'Missing from user_stats'
        ELSE 'Present in user_stats'
    END as stats_status
FROM profile_users pu
INNER JOIN game_completers gc ON gc.user_id = pu.id
LEFT JOIN stats_users su ON su.user_id = pu.id
WHERE pu.email LIKE '%hollierobertson%'
   OR su.user_id IS NULL  -- Show users missing from stats
ORDER BY pu.email;

-- 3. Count total discrepancies
WITH users_with_completions AS (
    SELECT DISTINCT user_id
    FROM game_sessions
    WHERE game_won = true AND user_id IS NOT NULL
),
users_with_stats AS (
    SELECT DISTINCT user_id
    FROM user_stats
    WHERE user_id IS NOT NULL
)
SELECT
    (SELECT COUNT(*) FROM user_profiles) as total_profiles,
    (SELECT COUNT(*) FROM users_with_completions) as users_who_completed_games,
    (SELECT COUNT(*) FROM users_with_stats) as users_with_stats,
    (SELECT COUNT(*) FROM users_with_completions WHERE user_id NOT IN (SELECT user_id FROM users_with_stats)) as missing_from_stats;

-- 4. Find specific user hollierobertson
SELECT
    'user_profiles' as table_name,
    id, email, first_name, created_at
FROM user_profiles
WHERE email LIKE '%hollierobertson%'
UNION ALL
SELECT
    'user_stats' as table_name,
    user_id as id,
    'N/A' as email,
    'Games: ' || games_played || ', Won: ' || games_won as first_name,
    updated_at as created_at
FROM user_stats
WHERE user_id IN (SELECT id FROM user_profiles WHERE email LIKE '%hollierobertson%')
UNION ALL
SELECT
    'game_sessions' as table_name,
    user_id as id,
    'Game Won: ' || game_won as email,
    'Date: ' || puzzle_date as first_name,
    updated_at as created_at
FROM game_sessions
WHERE user_id IN (SELECT id FROM user_profiles WHERE email LIKE '%hollierobertson%')
    AND game_won = true
LIMIT 20;
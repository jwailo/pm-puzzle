-- Comprehensive fix for admin dashboard to ensure all users who have played are shown
-- This addresses the discrepancy where users appear in completions but not in the users list

-- 1. First, ensure user_stats records exist for all users who have played
-- This will create missing user_stats entries
INSERT INTO user_stats (user_id, games_played, games_won, current_streak, max_streak, created_at, updated_at)
SELECT
    gs.user_id,
    COUNT(*) as games_played,
    SUM(CASE WHEN gs.game_won THEN 1 ELSE 0 END) as games_won,
    0 as current_streak,  -- Will be updated by game logic
    0 as max_streak,      -- Will be updated by game logic
    MIN(gs.created_at) as created_at,
    MAX(gs.updated_at) as updated_at
FROM game_sessions gs
WHERE gs.user_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM user_stats us WHERE us.user_id = gs.user_id
    )
GROUP BY gs.user_id;

-- 2. Update the admin user list function to include ALL users
DROP FUNCTION IF EXISTS get_admin_user_list();

CREATE OR REPLACE FUNCTION get_admin_user_list()
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ,
    games_played INT,
    games_won INT,
    max_streak INT,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    WITH user_game_stats AS (
        -- Get game stats directly from game_sessions as backup
        SELECT
            user_id,
            COUNT(*) as games_played_actual,
            SUM(CASE WHEN game_won THEN 1 ELSE 0 END) as games_won_actual,
            MAX(updated_at) as last_played
        FROM game_sessions
        WHERE user_id IS NOT NULL
        GROUP BY user_id
    )
    SELECT
        up.id,
        up.first_name,
        up.email,
        up.created_at,
        GREATEST(
            COALESCE(us.games_played, 0),
            COALESCE(ugs.games_played_actual, 0)
        )::INT as games_played,
        GREATEST(
            COALESCE(us.games_won, 0),
            COALESCE(ugs.games_won_actual, 0)
        )::INT as games_won,
        COALESCE(us.max_streak, 0)::INT as max_streak,
        COALESCE(
            GREATEST(us.updated_at, ugs.last_played),
            up.created_at
        ) as updated_at
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.id = us.user_id
    LEFT JOIN user_game_stats ugs ON up.id = ugs.user_id
    ORDER BY up.created_at DESC;
$$;

-- 3. Fix the daily completions function with correct join
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();

CREATE OR REPLACE FUNCTION get_daily_puzzle_completions()
RETURNS TABLE (
    completion_date DATE,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    guesses INTEGER,
    completion_time INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gs.puzzle_date::DATE as completion_date,
        gs.user_id,
        COALESCE(up.email, 'Guest Player') as email,
        COALESCE(up.first_name, 'Guest') as first_name,
        gs.updated_at as completed_at,
        gs.current_row + 1 as guesses,
        gs.completion_time
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id  -- Fixed join
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL
    ORDER BY gs.puzzle_date DESC, gs.updated_at ASC;
END;
$$;

-- 4. Update the total users count to be accurate
DROP FUNCTION IF EXISTS get_admin_total_users();

CREATE OR REPLACE FUNCTION get_admin_total_users()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM user_profiles;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_user_list() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_total_users() TO anon, authenticated;

-- 6. Verify the fix by checking for the specific user
SELECT * FROM get_admin_user_list()
WHERE email LIKE '%hollierobertson%';

-- 7. Check overall stats
SELECT
    (SELECT COUNT(*) FROM user_profiles) as total_users_registered,
    (SELECT COUNT(*) FROM get_admin_user_list()) as users_in_admin_list,
    (SELECT COUNT(DISTINCT user_id) FROM game_sessions WHERE user_id IS NOT NULL) as unique_players,
    (SELECT COUNT(DISTINCT email) FROM get_daily_puzzle_completions() WHERE email != 'Guest Player') as users_with_completions;
-- Fix Active Users Tracking
-- The current function uses user_stats.updated_at which only updates when stats change
-- This fix uses game_sessions to properly track when users actually played

-- Drop the old function first
DROP FUNCTION IF EXISTS get_admin_active_users(INTEGER);

-- Create improved function that tracks actual gameplay activity
CREATE OR REPLACE FUNCTION get_admin_active_users(days INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Count unique users (both registered and guests) who have played in the last N days
    -- Using game_sessions as it records every game attempt
    SELECT COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) INTO active_count
    FROM game_sessions
    WHERE created_at >= NOW() - INTERVAL '1 day' * days;

    RETURN active_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_active_users(INTEGER) TO anon, authenticated;

-- Test the function
SELECT get_admin_active_users(1) as daily_active_users;
SELECT get_admin_active_users(7) as weekly_active_users;
SELECT get_admin_active_users(30) as monthly_active_users;

-- Compare with old method for debugging
SELECT
    'Old Method (user_stats.updated_at)' as method,
    COUNT(DISTINCT user_id) as active_users_1_day
FROM user_stats
WHERE updated_at >= NOW() - INTERVAL '1 day'
UNION ALL
SELECT
    'New Method (game_sessions.created_at)' as method,
    COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as active_users_1_day
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '1 day';

-- Show activity breakdown for last 30 days
SELECT
    DATE(created_at) as play_date,
    COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as unique_players,
    COUNT(*) as total_games_started
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY play_date DESC;
-- Enhanced Active Users Tracking with Breakdown
-- Provides both total active users and registered active users

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS get_admin_active_users(INTEGER);
DROP FUNCTION IF EXISTS get_admin_active_users_detailed(INTEGER);

-- Simple function for backward compatibility
CREATE OR REPLACE FUNCTION get_admin_active_users(days INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Count unique users (both registered and guests) who have played in the last N days
    SELECT COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) INTO active_count
    FROM game_sessions
    WHERE created_at >= NOW() - INTERVAL '1 day' * days;

    RETURN active_count;
END;
$$;

-- Detailed function that returns breakdown
CREATE OR REPLACE FUNCTION get_admin_active_users_detailed(days INTEGER)
RETURNS TABLE (
    total_active INTEGER,
    registered_active INTEGER,
    guest_active INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT COALESCE(user_id, session_id::uuid))::INTEGER as total_active,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::INTEGER as registered_active,
        COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL)::INTEGER as guest_active
    FROM game_sessions
    WHERE created_at >= NOW() - INTERVAL '1 day' * days;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_active_users(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_active_users_detailed(INTEGER) TO anon, authenticated;

-- Test the functions
SELECT 'Daily Active Users (Total)' as metric, get_admin_active_users(1) as count;
SELECT 'Weekly Active Users (Total)' as metric, get_admin_active_users(7) as count;
SELECT 'Monthly Active Users (Total)' as metric, get_admin_active_users(30) as count;

-- Get detailed breakdown
SELECT * FROM get_admin_active_users_detailed(1);  -- Daily
SELECT * FROM get_admin_active_users_detailed(7);  -- Weekly
SELECT * FROM get_admin_active_users_detailed(30); -- Monthly

-- Diagnostic: Show daily activity for the last 30 days
WITH daily_activity AS (
    SELECT
        DATE(created_at) as play_date,
        COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as total_players,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as registered_players,
        COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL) as guest_players,
        COUNT(*) as total_games
    FROM game_sessions
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
)
SELECT
    play_date,
    total_players,
    registered_players,
    guest_players,
    total_games,
    ROUND(100.0 * registered_players / NULLIF(total_players, 0), 1) as registered_pct
FROM daily_activity
ORDER BY play_date DESC;

-- Check if game_sessions is properly recording recent activity
SELECT
    'Last game recorded' as info,
    MAX(created_at) as timestamp
FROM game_sessions
UNION ALL
SELECT
    'Games today' as info,
    COUNT(*)::text::timestamp as timestamp
FROM game_sessions
WHERE DATE(created_at) = CURRENT_DATE;
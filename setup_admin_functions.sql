-- Admin Dashboard Setup - Run this in Supabase SQL Editor
-- This consolidates all admin functions needed for the dashboard

-- 1. Admin functions for bypassing RLS
CREATE OR REPLACE FUNCTION get_admin_total_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total INTEGER;
BEGIN
    SELECT COUNT(*) INTO total FROM user_profiles;
    RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_total_games()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total INTEGER;
BEGIN
    SELECT COALESCE(SUM(games_played), 0) INTO total FROM user_stats;
    RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_active_users(days INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count 
    FROM user_stats 
    WHERE updated_at >= NOW() - INTERVAL '1 day' * days;
    RETURN active_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_signup_percentage()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    registered_users INTEGER;
    total_players INTEGER;
    percentage INTEGER;
BEGIN
    -- Get registered users count
    SELECT COUNT(*) INTO registered_users FROM user_profiles;
    
    -- Get total players count (everyone who has played)  
    SELECT COUNT(*) INTO total_players FROM user_stats;
    
    -- Calculate percentage
    IF total_players = 0 THEN
        RETURN '0%';
    END IF;
    
    percentage := ROUND((registered_users::DECIMAL / total_players) * 100);
    RETURN percentage::TEXT || '%';
END;
$$;

-- 2. Share analytics functions
CREATE OR REPLACE FUNCTION get_admin_total_shares()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total INTEGER;
BEGIN
    SELECT COUNT(*) INTO total FROM share_analytics;
    RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_share_stats()
RETURNS TABLE (
    audience_type VARCHAR(50),
    share_count BIGINT,
    recent_shares BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.audience_type,
        COUNT(*) as share_count,
        COUNT(CASE WHEN sa.shared_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_shares
    FROM share_analytics sa
    GROUP BY sa.audience_type
    ORDER BY share_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_recent_custom_shares()
RETURNS TABLE (
    custom_audience VARCHAR(100),
    shared_at TIMESTAMPTZ,
    share_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.custom_audience,
        sa.shared_at,
        COUNT(*) OVER (PARTITION BY sa.custom_audience) as share_count
    FROM share_analytics sa
    WHERE sa.audience_type = 'custom' 
    AND sa.custom_audience IS NOT NULL
    AND sa.custom_audience != ''
    ORDER BY sa.shared_at DESC
    LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_user_list()
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ,
    games_played INTEGER,
    games_won INTEGER,
    max_streak INTEGER,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.first_name::TEXT,
        up.email::TEXT,
        up.created_at,
        COALESCE(us.games_played, 0)::INTEGER as games_played,
        COALESCE(us.games_won, 0)::INTEGER as games_won,
        COALESCE(us.max_streak, 0)::INTEGER as max_streak,
        us.updated_at
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.id = us.user_id
    ORDER BY up.created_at DESC;
END;
$$;

-- 3. Grant permissions to all functions
GRANT EXECUTE ON FUNCTION get_admin_total_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_total_games() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_active_users(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_signup_percentage() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_total_shares() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_share_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_recent_custom_shares() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_user_list() TO anon, authenticated;

-- 4. Test the functions (optional - run these to verify they work)
-- SELECT get_admin_total_users();
-- SELECT get_admin_total_games();
-- SELECT get_admin_active_users(1);
-- SELECT get_admin_signup_percentage();
-- SELECT get_admin_total_shares();
-- SELECT * FROM get_admin_share_stats();
-- SELECT * FROM get_admin_user_list();
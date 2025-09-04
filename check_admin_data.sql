-- Run these queries in Supabase SQL Editor to check what data exists

-- 1. Check if there are any user profiles
SELECT COUNT(*) as user_count FROM user_profiles;

-- 2. Check if there are any user stats
SELECT COUNT(*) as stats_count FROM user_stats;

-- 3. Check sample of user stats to see what's there
SELECT * FROM user_stats LIMIT 5;

-- 4. Check daily leaderboard entries
SELECT COUNT(*) as leaderboard_count FROM daily_leaderboard;

-- 5. Check if RLS is blocking reads
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_stats', 'daily_leaderboard');

-- 6. If you see data above but admin shows zeros, create these functions
-- to bypass RLS for admin stats:

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_total_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_total_games() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_active_users(INTEGER) TO anon, authenticated;
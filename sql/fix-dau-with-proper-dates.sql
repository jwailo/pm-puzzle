-- Fix DAU calculation to use proper calendar dates
-- The issue is likely that "last 24 hours" includes parts of 2 days

-- Drop and recreate the function with better logic
DROP FUNCTION IF EXISTS get_admin_active_users(INTEGER);
DROP FUNCTION IF EXISTS get_admin_active_users_detailed(INTEGER);

-- Improved function that uses calendar days, not rolling 24-hour windows
CREATE OR REPLACE FUNCTION get_admin_active_users(days INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_count INTEGER;
BEGIN
    IF days = 1 THEN
        -- For DAU, count players who played TODAY (in the database's timezone)
        SELECT COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) INTO active_count
        FROM game_sessions
        WHERE DATE(created_at) = CURRENT_DATE;
    ELSE
        -- For other periods, use the date range
        SELECT COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) INTO active_count
        FROM game_sessions
        WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '1 day' * (days - 1)
          AND DATE(created_at) <= CURRENT_DATE;
    END IF;

    RETURN active_count;
END;
$$;

-- Detailed version with proper date handling
CREATE OR REPLACE FUNCTION get_admin_active_users_detailed(days INTEGER)
RETURNS TABLE (
    total_active INTEGER,
    registered_active INTEGER,
    guest_active INTEGER,
    date_range TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF days = 1 THEN
        -- For DAU, count players who played TODAY
        RETURN QUERY
        SELECT
            COUNT(DISTINCT COALESCE(user_id, session_id::uuid))::INTEGER as total_active,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::INTEGER as registered_active,
            COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL)::INTEGER as guest_active,
            'Today (' || CURRENT_DATE::TEXT || ')' as date_range
        FROM game_sessions
        WHERE DATE(created_at) = CURRENT_DATE;
    ELSE
        -- For other periods, use the date range
        RETURN QUERY
        SELECT
            COUNT(DISTINCT COALESCE(user_id, session_id::uuid))::INTEGER as total_active,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::INTEGER as registered_active,
            COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL)::INTEGER as guest_active,
            'Last ' || days || ' days (' || (CURRENT_DATE - INTERVAL '1 day' * (days - 1))::DATE::TEXT || ' to ' || CURRENT_DATE::TEXT || ')' as date_range
        FROM game_sessions
        WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '1 day' * (days - 1)
          AND DATE(created_at) <= CURRENT_DATE;
    END IF;
END;
$$;

-- Alternative: Create a function specifically for "today's" active users
CREATE OR REPLACE FUNCTION get_admin_dau_today()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) INTO active_count
    FROM game_sessions
    WHERE DATE(created_at) = CURRENT_DATE;

    RETURN active_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_active_users(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_active_users_detailed(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dau_today() TO anon, authenticated;

-- Test the functions
SELECT 'Old DAU (last 24 hrs)' as method, COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as count
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '1 day';

SELECT 'New DAU (today only)' as method, get_admin_active_users(1) as count;
SELECT 'Today DAU (specific function)' as method, get_admin_dau_today() as count;

-- Show the detailed breakdown
SELECT * FROM get_admin_active_users_detailed(1);  -- Today
SELECT * FROM get_admin_active_users_detailed(7);  -- Last 7 days
SELECT * FROM get_admin_active_users_detailed(30); -- Last 30 days

-- Show what's actually in the data
SELECT
    'Current Database Time' as info,
    NOW() as timestamp,
    CURRENT_DATE as current_date,
    NOW() AT TIME ZONE 'America/Los_Angeles' as la_time,
    CURRENT_DATE AT TIME ZONE 'America/Los_Angeles' as la_date;
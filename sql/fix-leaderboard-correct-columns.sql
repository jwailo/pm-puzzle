-- FIX get_public_daily_leaderboard to use daily_completions with CORRECT column names

-- Drop the old function first
DROP FUNCTION IF EXISTS get_public_daily_leaderboard(DATE);

-- Create the function using the CORRECT column names from daily_completions
CREATE OR REPLACE FUNCTION get_public_daily_leaderboard(target_date DATE)
RETURNS TABLE (
    user_id UUID,
    completion_time INTEGER,
    guesses INTEGER,
    user_profiles JSON,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.user_id,
        dc.time_seconds as completion_time,  -- Map time_seconds to completion_time
        dc.guesses,
        row_to_json(up.*) as user_profiles,
        COALESCE(dc.completed_at, dc.created_at) as created_at  -- Use completed_at if available
    FROM daily_completions dc
    LEFT JOIN user_profiles up ON dc.user_id = up.id
    WHERE dc.puzzle_date = target_date  -- Use puzzle_date not date
        AND dc.user_id IS NOT NULL -- Only signed-in users
    ORDER BY dc.time_seconds ASC, COALESCE(dc.completed_at, dc.created_at) ASC; -- Fastest times first
    -- NO LIMIT - show ALL completions!
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_public_daily_leaderboard(DATE) TO anon, authenticated;

-- Test the function with today's date
SELECT COUNT(*) as total_completions_today
FROM get_public_daily_leaderboard(CURRENT_DATE);

-- See the actual data for today
SELECT
    user_id,
    completion_time,
    guesses,
    user_profiles->>'first_name' as name,
    user_profiles->>'email' as email,
    created_at
FROM get_public_daily_leaderboard(CURRENT_DATE)
ORDER BY completion_time ASC;

-- Check yesterday too (in case today has no data yet)
SELECT COUNT(*) as total_completions_yesterday
FROM get_public_daily_leaderboard(CURRENT_DATE - INTERVAL '1 day');

-- See data for the last few days
SELECT
    puzzle_date,
    COUNT(*) as completions
FROM daily_completions
WHERE puzzle_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY puzzle_date
ORDER BY puzzle_date DESC;
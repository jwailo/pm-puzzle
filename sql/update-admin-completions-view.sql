-- Enhanced completions function that ensures ALL completions are shown
-- This addresses the issue where not all daily completions are appearing

-- Drop existing function
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();

-- Create improved function that returns ALL completions
CREATE OR REPLACE FUNCTION get_daily_puzzle_completions()
RETURNS TABLE (
    completion_date DATE,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    guesses INTEGER,
    completion_time INTEGER,
    session_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(gs.date, gs.created_at::DATE) as completion_date,
        gs.user_id,
        COALESCE(up.email, 'Unknown Email') as email,
        COALESCE(up.first_name, 'Unknown User') as first_name,
        gs.updated_at as completed_at,
        COALESCE(gs.current_row + 1, 6) as guesses,
        gs.completion_time,
        gs.id as session_id  -- Include session ID for uniqueness
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL  -- Only registered users
        AND gs.date IS NOT NULL  -- Must have a valid date
    ORDER BY gs.date DESC, gs.updated_at ASC;
END;
$$;

-- Create a summary function for the admin dashboard
CREATE OR REPLACE FUNCTION get_completions_summary()
RETURNS TABLE (
    total_completions BIGINT,
    unique_users BIGINT,
    days_with_completions BIGINT,
    most_recent_date DATE,
    oldest_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_completions,
        COUNT(DISTINCT user_id)::BIGINT as unique_users,
        COUNT(DISTINCT completion_date)::BIGINT as days_with_completions,
        MAX(completion_date) as most_recent_date,
        MIN(completion_date) as oldest_date
    FROM get_daily_puzzle_completions();
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_completions_summary() TO anon, authenticated;

-- Verify the function returns data
SELECT * FROM get_completions_summary();

-- Show sample of completions grouped by date
SELECT
    completion_date,
    COUNT(*) as completions_count,
    STRING_AGG(first_name || ' (' || email || ')', ', ') as users
FROM get_daily_puzzle_completions()
GROUP BY completion_date
ORDER BY completion_date DESC
LIMIT 10;

-- Check for any users who might be missing
SELECT
    gs.user_id,
    gs.date,
    gs.game_won,
    up.email,
    up.first_name,
    CASE
        WHEN up.id IS NULL THEN 'Missing Profile'
        ELSE 'Has Profile'
    END as profile_status
FROM game_sessions gs
LEFT JOIN user_profiles up ON gs.user_id = up.id
WHERE gs.game_won = true
    AND gs.user_id IS NOT NULL
    AND gs.date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY gs.date DESC, gs.updated_at DESC
LIMIT 20;
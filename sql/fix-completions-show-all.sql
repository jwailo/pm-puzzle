-- Fix to ensure ALL completions show in the admin dashboard
-- This will show every successful puzzle completion, with users appearing multiple times

-- First, let's check how many completions we have
SELECT
    COUNT(*) as total_completions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT date) as days_with_completions
FROM game_sessions
WHERE game_won = true
    AND user_id IS NOT NULL;

-- Drop and recreate the function to ensure it returns ALL completions
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
        gs.date::DATE as completion_date,
        gs.user_id,
        COALESCE(up.email, 'Unknown') as email,
        COALESCE(up.first_name, 'Unknown') as first_name,
        gs.updated_at as completed_at,
        gs.current_row + 1 as guesses,
        gs.completion_time
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id  -- Correct join
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL  -- Only registered users eligible for prizes
    ORDER BY gs.date DESC, gs.updated_at ASC;
END;
$$;

-- Also create a function that groups by date for easier processing
CREATE OR REPLACE FUNCTION get_completions_grouped_by_date()
RETURNS TABLE (
    completion_date DATE,
    completions_count BIGINT,
    users_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gs.date::DATE as completion_date,
        COUNT(*) as completions_count,
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'user_id', gs.user_id,
                'email', COALESCE(up.email, 'Unknown'),
                'first_name', COALESCE(up.first_name, 'Unknown'),
                'completed_at', gs.updated_at,
                'guesses', gs.current_row + 1,
                'completion_time', gs.completion_time
            ) ORDER BY gs.updated_at ASC
        ) as users_data
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL
    GROUP BY gs.date
    ORDER BY gs.date DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_completions_grouped_by_date() TO anon, authenticated;

-- Test the function to see how many completions we get
SELECT
    COUNT(*) as total_completions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT completion_date) as unique_days
FROM get_daily_puzzle_completions();

-- Show sample of completions to verify they're all there
SELECT * FROM get_daily_puzzle_completions()
LIMIT 20;

-- Check for a specific date to see all completions for that day
SELECT
    completion_date,
    COUNT(*) as completions_this_day,
    ARRAY_AGG(DISTINCT email) as users_who_completed
FROM get_daily_puzzle_completions()
GROUP BY completion_date
ORDER BY completion_date DESC
LIMIT 10;
-- Fix the join issue in get_daily_puzzle_completions function
-- The issue is that it's joining on up.user_id when it should be up.id

-- Drop and recreate the function with the correct join
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
    LEFT JOIN user_profiles up ON gs.user_id = up.id  -- Fixed: was up.user_id, should be up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL  -- Only registered users eligible for prizes
    ORDER BY gs.puzzle_date DESC, gs.updated_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO authenticated, anon;

-- Test the function to verify it works
SELECT COUNT(DISTINCT email) as unique_users_with_completions
FROM get_daily_puzzle_completions()
WHERE email != 'Guest Player';

-- Check if specific user appears now
SELECT DISTINCT email, first_name
FROM get_daily_puzzle_completions()
WHERE email LIKE '%hollierobertson%'
LIMIT 5;
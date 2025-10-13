-- Create function to get daily puzzle completions for winner selection
-- This function returns all users who completed the puzzle for each day

CREATE OR REPLACE FUNCTION get_daily_puzzle_completions()
RETURNS TABLE (
    puzzle_date DATE,
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
        gs.puzzle_date::DATE as puzzle_date,
        gs.user_id,
        COALESCE(up.email, 'Guest Player') as email,
        COALESCE(up.first_name, 'Guest') as first_name,
        gs.updated_at as completed_at,
        gs.current_row + 1 as guesses,
        gs.completion_time
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.user_id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL  -- Only registered users eligible for prizes
    ORDER BY gs.puzzle_date DESC, gs.updated_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO authenticated;

-- Create a function to get completions for a specific date range
CREATE OR REPLACE FUNCTION get_puzzle_completions_by_date(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    puzzle_date DATE,
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
        gs.puzzle_date::DATE as puzzle_date,
        gs.user_id,
        COALESCE(up.email, 'Guest Player') as email,
        COALESCE(up.first_name, 'Guest') as first_name,
        gs.updated_at as completed_at,
        gs.current_row + 1 as guesses,
        gs.completion_time
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.user_id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL  -- Only registered users eligible for prizes
        AND gs.puzzle_date >= start_date
        AND gs.puzzle_date <= end_date
    ORDER BY gs.puzzle_date DESC, gs.updated_at ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_puzzle_completions_by_date(DATE, DATE) TO authenticated;

-- Test the function
SELECT * FROM get_daily_puzzle_completions()
WHERE puzzle_date >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 20;
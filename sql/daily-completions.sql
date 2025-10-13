-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();

-- Create function to get all puzzle completions by date
-- Users will appear multiple times if they completed puzzles on different days
CREATE OR REPLACE FUNCTION get_daily_puzzle_completions()
RETURNS TABLE (
    completion_date DATE,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    games_won_that_day INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH daily_completions AS (
        -- Get all game sessions where user won
        SELECT
            gs.date::DATE as game_date,
            gs.user_id,
            COUNT(*) as daily_wins
        FROM game_sessions gs
        WHERE gs.game_won = true
            AND gs.user_id IS NOT NULL  -- Only registered users
        GROUP BY gs.date::DATE, gs.user_id

        UNION ALL

        -- Also check user_stats for users who have won games (fallback)
        -- This captures historical data where we might not have game_sessions records
        SELECT
            CURRENT_DATE as game_date,
            us.user_id,
            us.games_won as daily_wins
        FROM user_stats us
        WHERE us.games_won > 0
            AND us.user_id IS NOT NULL
            AND NOT EXISTS (
                -- Don't include if we already have game_sessions data for this user
                SELECT 1 FROM game_sessions gs
                WHERE gs.user_id = us.user_id AND gs.game_won = true
            )
    )
    SELECT
        dc.game_date as completion_date,
        dc.user_id,
        COALESCE(up.email, 'Unknown') as email,
        COALESCE(up.first_name, 'Unknown') as first_name,
        dc.daily_wins::INTEGER as games_won_that_day
    FROM daily_completions dc
    LEFT JOIN user_profiles up ON dc.user_id = up.id
    ORDER BY dc.game_date DESC, up.first_name ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon;

-- Test the function
SELECT * FROM get_daily_puzzle_completions();
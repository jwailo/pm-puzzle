-- Simple function to get all users who have completed at least one puzzle
DROP FUNCTION IF EXISTS get_puzzle_completions_simple();

CREATE OR REPLACE FUNCTION get_puzzle_completions_simple()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    first_name TEXT,
    games_won INTEGER,
    last_played TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        us.user_id,
        COALESCE(up.email, 'Unknown') as email,
        COALESCE(up.first_name, 'Unknown') as first_name,
        us.games_won,
        us.updated_at as last_played
    FROM user_stats us
    LEFT JOIN user_profiles up ON us.user_id = up.id
    WHERE us.games_won > 0  -- Only show users who have won at least one game
        AND us.user_id IS NOT NULL  -- Only registered users
    ORDER BY us.updated_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_puzzle_completions_simple() TO authenticated;
GRANT EXECUTE ON FUNCTION get_puzzle_completions_simple() TO anon;

-- Test it
SELECT * FROM get_puzzle_completions_simple();
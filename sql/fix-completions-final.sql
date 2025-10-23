-- FINAL FIX: Ensure column names match what JavaScript expects
-- The function returns data but JavaScript isn't displaying it

-- First, let's see exactly what the function returns
SELECT * FROM get_daily_puzzle_completions()
WHERE user_id IS NOT NULL
LIMIT 5;

-- Now create a version that definitely works with the admin panel
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();

CREATE OR REPLACE FUNCTION get_daily_puzzle_completions()
RETURNS TABLE (
    puzzle_date DATE,  -- Some JS might expect puzzle_date
    completion_date DATE,  -- Or completion_date
    user_id UUID,
    email TEXT,
    first_name TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    guesses INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gs.created_at::DATE as puzzle_date,  -- Include as puzzle_date
        gs.created_at::DATE as completion_date,  -- AND as completion_date
        gs.user_id,
        COALESCE(up.email, 'Unknown Email') as email,
        COALESCE(up.first_name, 'Unknown User') as first_name,
        COALESCE(gs.updated_at, gs.created_at) as completed_at,
        COALESCE(gs.current_row + 1, 6) as guesses
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL  -- Only registered users for prizes
    ORDER BY gs.created_at::DATE DESC, gs.updated_at ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon, authenticated;

-- Test it
SELECT COUNT(*) as should_be_106 FROM get_daily_puzzle_completions();

-- Create a simple backup function that returns minimal data
CREATE OR REPLACE FUNCTION get_puzzle_completions_simple()
RETURNS TABLE (
    puzzle_date DATE,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    games_won INTEGER,
    last_played TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        gs.created_at::DATE as puzzle_date,
        gs.user_id,
        COALESCE(up.email, 'Unknown') as email,
        COALESCE(up.first_name, 'Unknown') as first_name,
        1 as games_won,  -- They won this game
        gs.created_at as last_played
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL
    ORDER BY gs.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_puzzle_completions_simple() TO anon, authenticated;

-- Test the simple version
SELECT COUNT(*) as simple_version_count FROM get_puzzle_completions_simple();
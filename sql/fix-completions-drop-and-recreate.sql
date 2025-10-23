-- DROP AND RECREATE FUNCTIONS PROPERLY
-- This fixes the error about changing return types

-- First, drop ALL existing versions of these functions
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();
DROP FUNCTION IF EXISTS get_puzzle_completions_simple();
DROP FUNCTION IF EXISTS get_all_puzzle_completions();
DROP FUNCTION IF EXISTS get_completions_grouped_by_date();
DROP FUNCTION IF EXISTS get_completions_summary();

-- Now create the main function fresh
CREATE OR REPLACE FUNCTION get_daily_puzzle_completions()
RETURNS TABLE (
    completion_date DATE,
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
        COALESCE(gs.date, gs.created_at::DATE) as completion_date,
        gs.user_id,
        COALESCE(up.email, 'Unknown Email') as email,
        COALESCE(up.first_name, 'Unknown User') as first_name,
        COALESCE(gs.updated_at, gs.created_at) as completed_at,
        COALESCE(gs.current_row + 1, 6) as guesses
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL  -- Only registered users
    ORDER BY COALESCE(gs.date, gs.created_at::DATE) DESC,
             COALESCE(gs.updated_at, gs.created_at) ASC;
END;
$$;

-- Create the simple fallback function
CREATE OR REPLACE FUNCTION get_puzzle_completions_simple()
RETURNS TABLE (
    completion_date DATE,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    guesses INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        COALESCE(gs.date, gs.created_at::DATE) as completion_date,
        gs.user_id,
        COALESCE(up.email, 'Unknown') as email,
        COALESCE(up.first_name, 'Unknown') as first_name,
        gs.created_at as completed_at,
        COALESCE(gs.current_row + 1, 6) as guesses
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL
    ORDER BY gs.created_at DESC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_puzzle_completions_simple() TO anon, authenticated;

-- Test both functions
SELECT '=== Main Function Test ===' as test_name, COUNT(*) as count
FROM get_daily_puzzle_completions();

SELECT '=== Simple Function Test ===' as test_name, COUNT(*) as count
FROM get_puzzle_completions_simple();

-- Show sample data
SELECT '=== Sample Data from Main Function ===' as info;
SELECT * FROM get_daily_puzzle_completions() LIMIT 10;

-- Verify dates are being returned
SELECT '=== Date Distribution ===' as info;
SELECT
    completion_date,
    COUNT(*) as completions,
    STRING_AGG(first_name, ', ' ORDER BY first_name) as users
FROM get_daily_puzzle_completions()
GROUP BY completion_date
ORDER BY completion_date DESC
LIMIT 10;
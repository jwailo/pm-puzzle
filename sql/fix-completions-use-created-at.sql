-- FIX: Use created_at instead of date since all date values are NULL
-- This will make all completions visible

-- Drop the existing function
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();

-- Create fixed function that uses created_at for the date
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
        gs.created_at::DATE as completion_date,  -- Use created_at since date is NULL
        gs.user_id,
        COALESCE(up.email, 'Unknown Email') as email,
        COALESCE(up.first_name, 'Unknown User') as first_name,
        gs.updated_at as completed_at,
        COALESCE(gs.current_row + 1, 6) as guesses
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        -- Include both registered and guest winners to see all data
        -- Remove the user_id filter temporarily to see all wins
    ORDER BY gs.created_at::DATE DESC, gs.updated_at ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon, authenticated;

-- Test the function
SELECT '=== TEST: Function should now return data ===' as info;
SELECT COUNT(*) as total_completions
FROM get_daily_puzzle_completions();

-- Show sample of completions
SELECT '=== SAMPLE OF COMPLETIONS ===' as info;
SELECT *
FROM get_daily_puzzle_completions()
WHERE user_id IS NOT NULL  -- Filter to registered users only
LIMIT 20;

-- Show completions grouped by date
SELECT '=== COMPLETIONS BY DATE ===' as info;
SELECT
    completion_date,
    COUNT(*) as total_completions,
    COUNT(DISTINCT user_id) as unique_users,
    STRING_AGG(
        CASE
            WHEN first_name != 'Unknown User' THEN first_name
            ELSE 'Guest'
        END, ', '
        ORDER BY first_name
    ) as users
FROM get_daily_puzzle_completions()
WHERE user_id IS NOT NULL
GROUP BY completion_date
ORDER BY completion_date DESC
LIMIT 15;

-- Check if we have registered user completions
SELECT '=== REGISTERED USER COMPLETIONS ===' as info;
SELECT COUNT(*) as registered_user_wins
FROM get_daily_puzzle_completions()
WHERE user_id IS NOT NULL;

-- Also update the date column for future games
-- This will populate the date field with the created_at date for existing records
UPDATE game_sessions
SET date = created_at::DATE
WHERE date IS NULL AND created_at IS NOT NULL;

-- Verify the update
SELECT '=== AFTER UPDATE: Check dates ===' as info;
SELECT
    COUNT(*) as total_sessions,
    SUM(CASE WHEN date IS NULL THEN 1 ELSE 0 END) as null_dates,
    SUM(CASE WHEN date IS NOT NULL THEN 1 ELSE 0 END) as valid_dates
FROM game_sessions;
-- Fix the get_public_streak_leaderboard function
-- This script safely drops the old function and creates the new one

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS get_public_streak_leaderboard();

-- Step 2: Create the new function with updated return type
CREATE OR REPLACE FUNCTION get_public_streak_leaderboard()
RETURNS TABLE (
    user_id UUID,
    max_streak INTEGER,
    current_streak INTEGER,
    games_played INTEGER,
    games_won INTEGER,
    first_name TEXT,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        us.user_id,
        us.max_streak,
        us.current_streak,
        us.games_played,
        us.games_won,
        up.first_name,
        up.email
    FROM user_stats us
    INNER JOIN user_profiles up ON us.user_id = up.id
    WHERE us.max_streak > 0
      -- Filter out Player X entries and test accounts
      AND up.first_name IS NOT NULL
      AND up.first_name != ''
      AND up.first_name NOT LIKE 'Player %'
      AND up.email NOT LIKE '%+%'  -- Remove test accounts with + in email
    ORDER BY us.max_streak DESC, up.first_name ASC
    LIMIT 10;
END;
$$;

-- Step 3: Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_public_streak_leaderboard() TO authenticated, anon;

-- Step 4: Test the updated function
SELECT * FROM get_public_streak_leaderboard();
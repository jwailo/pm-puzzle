-- Create database functions to bypass RLS for leaderboards
-- Execute these in the Supabase SQL editor

-- Function to get daily leaderboard (public access)
CREATE OR REPLACE FUNCTION get_public_daily_leaderboard(target_date DATE)
RETURNS TABLE (
    user_id UUID,
    date DATE,
    completion_time INTEGER,
    guesses INTEGER,
    word TEXT,
    user_profiles JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dl.user_id,
        dl.date,
        dl.completion_time,
        dl.guesses,
        dl.word,
        to_jsonb(row_to_json(up.*)) as user_profiles
    FROM daily_leaderboard dl
    LEFT JOIN user_profiles up ON dl.user_id = up.id
    WHERE dl.date = target_date
    ORDER BY dl.completion_time ASC
    LIMIT 10;
END;
$$;

-- Function to get streak leaderboard (public access)
-- Filters out test users and Player X entries
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
    ORDER BY us.max_streak DESC, us.games_won DESC, us.user_id ASC
    LIMIT 10;
END;
$$;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_public_daily_leaderboard(DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_public_streak_leaderboard() TO authenticated, anon;
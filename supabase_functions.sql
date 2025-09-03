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
CREATE OR REPLACE FUNCTION get_public_streak_leaderboard()
RETURNS TABLE (
    user_id UUID,
    max_streak INTEGER,
    current_streak INTEGER,
    total_games INTEGER,
    games_won INTEGER,
    user_profiles JSONB
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
        us.total_games,
        us.games_won,
        to_jsonb(row_to_json(up.*)) as user_profiles
    FROM user_stats us
    LEFT JOIN user_profiles up ON us.user_id = up.id
    WHERE us.max_streak > 0
    ORDER BY us.max_streak DESC, us.current_streak DESC
    LIMIT 10;
END;
$$;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_public_daily_leaderboard(DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_public_streak_leaderboard() TO authenticated, anon;
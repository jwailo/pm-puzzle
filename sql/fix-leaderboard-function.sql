-- FIX get_public_daily_leaderboard to use the correct table and remove LIMIT 10

-- First, let's see what the current function looks like
SELECT routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_public_daily_leaderboard';

-- Check if daily_completions table exists (most likely candidate)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'daily_completions'
ORDER BY ordinal_position;

-- Now recreate the function using daily_completions table (most common name)
-- This will work if daily_completions exists
DROP FUNCTION IF EXISTS get_public_daily_leaderboard(DATE);

CREATE OR REPLACE FUNCTION get_public_daily_leaderboard(target_date DATE)
RETURNS TABLE (
    user_id UUID,
    completion_time INTEGER,
    guesses INTEGER,
    user_profiles JSON,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First try daily_completions table
    BEGIN
        RETURN QUERY
        SELECT
            dc.user_id,
            dc.completion_time,
            dc.guesses,
            row_to_json(up.*) as user_profiles,
            dc.created_at
        FROM daily_completions dc
        LEFT JOIN user_profiles up ON dc.user_id = up.id
        WHERE dc.date = target_date
            AND dc.user_id IS NOT NULL -- Only signed-in users
        ORDER BY dc.completion_time ASC, dc.created_at ASC; -- Fastest times first
        -- NO LIMIT - show ALL completions
    EXCEPTION
        WHEN undefined_table THEN
            -- If daily_completions doesn't exist, try game_sessions
            RETURN QUERY
            SELECT
                gs.user_id,
                gs.completion_time,
                gs.guesses,
                row_to_json(up.*) as user_profiles,
                gs.created_at
            FROM game_sessions gs
            LEFT JOIN user_profiles up ON gs.user_id = up.id
            WHERE DATE(gs.created_at) = target_date
                AND gs.user_id IS NOT NULL
                AND gs.won = true
            ORDER BY gs.completion_time ASC, gs.created_at ASC;
            -- NO LIMIT - show ALL completions
    END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_public_daily_leaderboard(DATE) TO anon, authenticated;

-- Test the function
SELECT COUNT(*) as total_completions
FROM get_public_daily_leaderboard(CURRENT_DATE);

-- See the actual data
SELECT
    user_id,
    completion_time,
    guesses,
    user_profiles->>'first_name' as name,
    created_at
FROM get_public_daily_leaderboard(CURRENT_DATE)
ORDER BY completion_time ASC;
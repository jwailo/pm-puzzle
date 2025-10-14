-- First, let's clear the test migration data that put everyone on today
DELETE FROM daily_completions
WHERE puzzle_date = CURRENT_DATE
AND guesses = 6  -- This was our default migration value
AND puzzle_word IS NULL;  -- Migration didn't have the actual word

-- Now create an improved function that shows actual daily completions
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();

CREATE OR REPLACE FUNCTION get_daily_puzzle_completions()
RETURNS TABLE (
    completion_date DATE,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    guesses INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Get actual completions from daily_completions table
    SELECT
        dc.puzzle_date as completion_date,
        dc.user_id,
        COALESCE(up.email, 'Unknown') as email,
        COALESCE(up.first_name, 'Unknown') as first_name,
        dc.guesses,
        dc.completed_at
    FROM daily_completions dc
    LEFT JOIN user_profiles up ON dc.user_id = up.id
    WHERE dc.puzzle_word IS NOT NULL  -- Only real completions, not migrations

    UNION ALL

    -- For historical data, use user_stats last_played dates
    -- This gives us at least one completion per user who has won
    SELECT
        DATE(us.updated_at) as completion_date,
        us.user_id,
        COALESCE(up.email, 'Unknown') as email,
        COALESCE(up.first_name, 'Unknown') as first_name,
        NULL as guesses,  -- We don't have historical guess data
        us.updated_at as completed_at
    FROM user_stats us
    LEFT JOIN user_profiles up ON us.user_id = up.id
    WHERE us.user_id IS NOT NULL
        AND us.games_won > 0
        AND NOT EXISTS (
            -- Don't duplicate if we have real daily_completions data
            SELECT 1 FROM daily_completions dc
            WHERE dc.user_id = us.user_id
            AND dc.puzzle_word IS NOT NULL
        )

    ORDER BY completion_date DESC, completed_at ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon;

-- Let's also create a function to manually add historical completions
-- You can use this to add past completions if you know the dates
CREATE OR REPLACE FUNCTION add_historical_completion(
    p_user_email TEXT,
    p_puzzle_date DATE,
    p_guesses INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user_id from email
    SELECT id INTO v_user_id
    FROM user_profiles
    WHERE email = p_user_email;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO daily_completions (
            user_id,
            puzzle_date,
            guesses,
            completed_at
        ) VALUES (
            v_user_id,
            p_puzzle_date,
            p_guesses,
            p_puzzle_date + TIME '23:59:59'  -- Set to end of day
        )
        ON CONFLICT (user_id, puzzle_date)
        DO UPDATE SET
            guesses = COALESCE(EXCLUDED.guesses, daily_completions.guesses);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION add_historical_completion(TEXT, DATE, INTEGER) TO authenticated;

-- Test the improved function
SELECT * FROM get_daily_puzzle_completions()
ORDER BY completion_date DESC;

-- Show how many completions per day
SELECT
    completion_date,
    COUNT(*) as total_completions,
    STRING_AGG(first_name || ' (' || email || ')', ', ') as players
FROM get_daily_puzzle_completions()
GROUP BY completion_date
ORDER BY completion_date DESC;
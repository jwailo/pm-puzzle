-- GET ALL COMPLETIONS FOR ADMIN PANEL

-- First, let's see what the puzzle tracking looks like
-- The game calls record_puzzle_completion, so there must be a storage table

-- 1. Check if puzzle_completions table exists
SELECT * FROM puzzle_completions
WHERE puzzle_date = '2025-10-23'
LIMIT 10;

-- 2. If that doesn't work, check daily_completions
SELECT * FROM daily_completions
WHERE date = '2025-10-23'
LIMIT 10;

-- 3. Create a function to get ALL completions (not just top 10)
CREATE OR REPLACE FUNCTION get_all_puzzle_completions_for_date(target_date DATE)
RETURNS TABLE (
    user_id UUID,
    first_name TEXT,
    email TEXT,
    completion_time INTEGER,
    guesses INTEGER,
    completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Try to get from puzzle_completions first
    SELECT
        pc.user_id,
        up.first_name,
        up.email,
        pc.time_seconds as completion_time,
        pc.guesses,
        pc.created_at as completed_at
    FROM puzzle_completions pc
    JOIN user_profiles up ON pc.user_id = up.id
    WHERE pc.puzzle_date = target_date
        AND pc.user_id IS NOT NULL -- Only signed-in users
    ORDER BY pc.created_at ASC; -- Show in order of completion
EXCEPTION
    WHEN undefined_table THEN
        -- If puzzle_completions doesn't exist, try daily_completions
        RETURN QUERY
        SELECT
            dc.user_id,
            up.first_name,
            up.email,
            dc.completion_time,
            dc.guesses,
            dc.created_at as completed_at
        FROM daily_completions dc
        JOIN user_profiles up ON dc.user_id = up.id
        WHERE dc.date = target_date
            AND dc.user_id IS NOT NULL
        ORDER BY dc.created_at ASC;
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION get_all_puzzle_completions_for_date(DATE) TO anon, authenticated;

-- 5. Test it
SELECT COUNT(*) as total_completions_today
FROM get_all_puzzle_completions_for_date('2025-10-23');

SELECT * FROM get_all_puzzle_completions_for_date('2025-10-23');
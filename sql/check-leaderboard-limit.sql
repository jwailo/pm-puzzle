-- CHECK IF get_public_daily_leaderboard HAS A LIMIT

-- 1. Get the function definition
SELECT
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_public_daily_leaderboard';

-- 2. Count how many results it returns for a busy day
SELECT COUNT(*) as total_completions
FROM get_public_daily_leaderboard('2025-10-22');

-- 3. Check if it's exactly 10 (suggesting a LIMIT 10)
SELECT COUNT(*) as oct22_count
FROM get_public_daily_leaderboard('2025-10-22')
UNION ALL
SELECT COUNT(*) as oct21_count
FROM get_public_daily_leaderboard('2025-10-21')
UNION ALL
SELECT COUNT(*) as oct20_count
FROM get_public_daily_leaderboard('2025-10-20');

-- 4. Create a function to get ALL completions for a day
-- This will bypass any limit in the leaderboard function
CREATE OR REPLACE FUNCTION get_all_daily_completions(target_date DATE)
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
    -- Return ALL users who completed the puzzle on the given date
    -- This needs to pull from wherever the completion data is actually stored
    RETURN QUERY
    SELECT
        us.user_id,
        up.first_name,
        up.email,
        0 as completion_time, -- We don't have exact times
        0 as guesses, -- We don't have exact guesses
        us.updated_at as completed_at
    FROM user_stats us
    JOIN user_profiles up ON us.user_id = up.id
    WHERE DATE(us.last_completed) = target_date
        OR DATE(us.updated_at) = target_date
    ORDER BY us.updated_at DESC;
END;
$$;

-- 5. Test the new function
SELECT * FROM get_all_daily_completions('2025-10-23');
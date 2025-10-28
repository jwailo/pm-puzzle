-- UPDATE get_public_daily_leaderboard TO SHOW ALL COMPLETIONS (not just top 10)

-- 1. First, let's see the current function definition
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_public_daily_leaderboard';

-- 2. Drop and recreate the function without LIMIT 10
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
    RETURN QUERY
    SELECT
        pc.user_id,
        pc.time_seconds as completion_time,
        pc.guesses,
        row_to_json(up.*) as user_profiles,
        pc.created_at
    FROM puzzle_completions pc
    LEFT JOIN user_profiles up ON pc.user_id = up.id
    WHERE pc.puzzle_date = target_date
        AND pc.user_id IS NOT NULL -- Only signed-in users
    ORDER BY pc.time_seconds ASC, pc.created_at ASC; -- Fastest times first, then by completion order
    -- REMOVED: LIMIT 10
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_public_daily_leaderboard(DATE) TO anon, authenticated;

-- 4. Test the updated function
SELECT COUNT(*) as total_completions_today
FROM get_public_daily_leaderboard('2025-10-23');

-- 5. Verify it returns all completions
SELECT
    user_id,
    completion_time,
    guesses,
    user_profiles->>'first_name' as first_name,
    user_profiles->>'email' as email
FROM get_public_daily_leaderboard('2025-10-23')
ORDER BY completion_time ASC;

-- 6. Show counts for recent days to verify no limit
SELECT
    '2025-10-23' as date,
    COUNT(*) as count
FROM get_public_daily_leaderboard('2025-10-23')
UNION ALL
SELECT
    '2025-10-22' as date,
    COUNT(*) as count
FROM get_public_daily_leaderboard('2025-10-22')
UNION ALL
SELECT
    '2025-10-21' as date,
    COUNT(*) as count
FROM get_public_daily_leaderboard('2025-10-21')
ORDER BY date DESC;
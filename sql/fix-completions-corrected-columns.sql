-- First, check what columns actually exist in game_sessions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'game_sessions'
ORDER BY ordinal_position;

-- Drop the broken function
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();

-- Create corrected function without completion_time column
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
        gs.date::DATE as completion_date,
        gs.user_id,
        COALESCE(up.email, 'Guest Player') as email,
        COALESCE(up.first_name, 'Guest') as first_name,
        gs.updated_at as completed_at,
        gs.current_row + 1 as guesses
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id  -- Correct join
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL  -- Only registered users
    ORDER BY gs.date DESC, gs.updated_at ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon, authenticated;

-- Now test the diagnostic queries
-- 1. Check what data we have
SELECT
    'Total game_sessions' as metric,
    COUNT(*) as count
FROM game_sessions
UNION ALL
SELECT
    'Sessions where game_won = true',
    COUNT(*)
FROM game_sessions
WHERE game_won = true
UNION ALL
SELECT
    'Winning sessions by registered users',
    COUNT(*)
FROM game_sessions
WHERE game_won = true AND user_id IS NOT NULL;

-- 2. Check date distribution for last 30 days
SELECT
    date,
    COUNT(*) as total_sessions,
    SUM(CASE WHEN game_won = true THEN 1 ELSE 0 END) as won_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(CASE WHEN game_won = true AND user_id IS NOT NULL THEN 1 ELSE 0 END) as registered_winners
FROM game_sessions
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    AND date IS NOT NULL
GROUP BY date
ORDER BY date DESC;

-- 3. Now test the fixed function
SELECT COUNT(*) as total_completions
FROM get_daily_puzzle_completions();

-- 4. Sample of completions
SELECT *
FROM get_daily_puzzle_completions()
ORDER BY completion_date DESC, completed_at ASC
LIMIT 20;

-- 5. Check for users with multiple completions
SELECT
    email,
    first_name,
    COUNT(DISTINCT completion_date) as days_completed,
    COUNT(*) as total_completions
FROM get_daily_puzzle_completions()
GROUP BY email, first_name
HAVING COUNT(DISTINCT completion_date) > 1
ORDER BY days_completed DESC
LIMIT 10;

-- 6. Summary by date
SELECT
    completion_date,
    COUNT(*) as completions_count,
    STRING_AGG(first_name || ' (' || email || ')', ', ' ORDER BY first_name) as users
FROM get_daily_puzzle_completions()
WHERE completion_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY completion_date
ORDER BY completion_date DESC;
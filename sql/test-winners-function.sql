-- Test if the functions exist and work

-- 1. Check if functions exist
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_daily_puzzle_completions', 'get_puzzle_completions_by_date');

-- 2. Test direct query to see what data we have
SELECT
    gs.puzzle_date::DATE as puzzle_date,
    gs.user_id,
    gs.game_won,
    gs.current_row + 1 as guesses,
    gs.completion_time,
    gs.updated_at,
    up.email,
    up.first_name
FROM game_sessions gs
LEFT JOIN user_profiles up ON gs.user_id = up.user_id
WHERE gs.game_won = true
    AND gs.user_id IS NOT NULL
    AND gs.puzzle_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY gs.puzzle_date DESC, gs.updated_at ASC
LIMIT 20;

-- 3. Check if game_sessions has the columns we need
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'game_sessions'
    AND column_name IN ('puzzle_date', 'game_won', 'current_row', 'completion_time')
ORDER BY column_name;
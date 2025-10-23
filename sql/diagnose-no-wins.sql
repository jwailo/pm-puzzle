-- COMPREHENSIVE DIAGNOSTIC: Why are there no winning games?
-- Run this entire script to understand the game_sessions data

-- ================================================
-- STEP 1: Basic table check
-- ================================================
SELECT '=== 1. Check if game_sessions table exists ===' as step;
SELECT COUNT(*) as total_rows FROM game_sessions;

-- ================================================
-- STEP 2: Check game_won column values
-- ================================================
SELECT '=== 2. Distribution of game_won values ===' as step;
SELECT
    game_won,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM game_sessions
GROUP BY game_won
ORDER BY game_won;

-- ================================================
-- STEP 3: Check for NULL values
-- ================================================
SELECT '=== 3. NULL value analysis ===' as step;
SELECT
    COUNT(*) as total_sessions,
    SUM(CASE WHEN game_won IS NULL THEN 1 ELSE 0 END) as game_won_null,
    SUM(CASE WHEN game_won = true THEN 1 ELSE 0 END) as game_won_true,
    SUM(CASE WHEN game_won = false THEN 1 ELSE 0 END) as game_won_false
FROM game_sessions;

-- ================================================
-- STEP 4: Look at sample data
-- ================================================
SELECT '=== 4. Sample of 20 most recent game sessions ===' as step;
SELECT
    id,
    session_id,
    user_id,
    game_won,
    game_state,
    current_row,
    date,
    created_at,
    updated_at
FROM game_sessions
ORDER BY created_at DESC
LIMIT 20;

-- ================================================
-- STEP 5: Check game_state values
-- ================================================
SELECT '=== 5. Game state distribution ===' as step;
SELECT
    game_state,
    COUNT(*) as count
FROM game_sessions
GROUP BY game_state
ORDER BY count DESC;

-- ================================================
-- STEP 6: Look for completed games (reached 6 rows or got the word)
-- ================================================
SELECT '=== 6. Games by current_row (how many guesses used) ===' as step;
SELECT
    current_row,
    COUNT(*) as count,
    SUM(CASE WHEN game_won = true THEN 1 ELSE 0 END) as won,
    SUM(CASE WHEN game_won = false THEN 1 ELSE 0 END) as lost
FROM game_sessions
GROUP BY current_row
ORDER BY current_row;

-- ================================================
-- STEP 7: Check if there's a pattern with board_state
-- ================================================
SELECT '=== 7. Sample of games with board_state ===' as step;
SELECT
    id,
    game_won,
    current_row,
    board_state,
    LENGTH(board_state) as board_length,
    created_at
FROM game_sessions
WHERE board_state IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ================================================
-- STEP 8: Look for games that SHOULD be wins
-- ================================================
SELECT '=== 8. Games that might be wins (completed rows) ===' as step;
SELECT
    id,
    session_id,
    game_won,
    current_row,
    board_state,
    created_at
FROM game_sessions
WHERE current_row >= 0  -- Has at least one guess
ORDER BY current_row DESC, created_at DESC
LIMIT 20;

-- ================================================
-- STEP 9: Check data types
-- ================================================
SELECT '=== 9. Column data types ===' as step;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'game_sessions'
    AND column_name IN ('game_won', 'game_state', 'current_row', 'board_state')
ORDER BY ordinal_position;

-- ================================================
-- STEP 10: Check for any text variations of "won"
-- ================================================
SELECT '=== 10. Check if game_state indicates wins ===' as step;
SELECT
    game_state,
    game_won,
    COUNT(*) as count
FROM game_sessions
WHERE game_state ILIKE '%won%'
    OR game_state ILIKE '%win%'
    OR game_state ILIKE '%complete%'
    OR game_state = 'success'
GROUP BY game_state, game_won;

-- ================================================
-- STEP 11: Manual check - are there ANY true values?
-- ================================================
SELECT '=== 11. Direct check for true values ===' as step;
SELECT * FROM game_sessions
WHERE game_won = true
LIMIT 5;

SELECT '=== 11b. Alternative syntax ===' as step;
SELECT * FROM game_sessions
WHERE game_won IS TRUE
LIMIT 5;

SELECT '=== 11c. Check as text ===' as step;
SELECT * FROM game_sessions
WHERE game_won::text = 'true'
LIMIT 5;

-- ================================================
-- STEP 12: Check if wins are being saved differently
-- ================================================
SELECT '=== 12. Look for potential winning patterns in board_state ===' as step;
-- A winning board state would have all green (correct) letters in a row
SELECT
    id,
    game_won,
    current_row,
    board_state,
    CASE
        WHEN board_state LIKE '%"correct","correct","correct","correct","correct"%' THEN 'Likely Win'
        WHEN board_state LIKE '%ccccc%' THEN 'Possible Win Pattern'
        ELSE 'Not Win Pattern'
    END as win_analysis,
    created_at
FROM game_sessions
WHERE board_state IS NOT NULL
    AND (
        board_state LIKE '%"correct","correct","correct","correct","correct"%'
        OR board_state LIKE '%correct%correct%correct%correct%correct%'
    )
LIMIT 20;

-- ================================================
-- FINAL SUMMARY
-- ================================================
SELECT '=== FINAL SUMMARY ===' as step;
SELECT
    'Total Sessions' as metric,
    COUNT(*)::text as value
FROM game_sessions
UNION ALL
SELECT
    'Sessions with game_won = true' as metric,
    COUNT(*)::text as value
FROM game_sessions
WHERE game_won = true
UNION ALL
SELECT
    'Sessions with game_won = false' as metric,
    COUNT(*)::text as value
FROM game_sessions
WHERE game_won = false
UNION ALL
SELECT
    'Sessions with game_won = NULL' as metric,
    COUNT(*)::text as value
FROM game_sessions
WHERE game_won IS NULL
UNION ALL
SELECT
    'Sessions with user_id' as metric,
    COUNT(*)::text as value
FROM game_sessions
WHERE user_id IS NOT NULL
UNION ALL
SELECT
    'Sessions without user_id' as metric,
    COUNT(*)::text as value
FROM game_sessions
WHERE user_id IS NULL;
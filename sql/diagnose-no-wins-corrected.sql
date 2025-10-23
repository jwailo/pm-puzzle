-- CORRECTED DIAGNOSTIC: Why are there no winning games?
-- This version removes references to non-existent columns

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
    game_over,
    current_row,
    guesses,
    date,
    created_at,
    updated_at
FROM game_sessions
ORDER BY created_at DESC
LIMIT 20;

-- ================================================
-- STEP 5: Check game_over values
-- ================================================
SELECT '=== 5. Game over distribution ===' as step;
SELECT
    game_over,
    COUNT(*) as count
FROM game_sessions
GROUP BY game_over
ORDER BY count DESC;

-- ================================================
-- STEP 6: Look for completed games (reached 6 rows or got the word)
-- ================================================
SELECT '=== 6. Games by current_row (how many guesses used) ===' as step;
SELECT
    current_row,
    COUNT(*) as count,
    SUM(CASE WHEN game_won = true THEN 1 ELSE 0 END) as won,
    SUM(CASE WHEN game_won = false THEN 1 ELSE 0 END) as lost,
    SUM(CASE WHEN game_won IS NULL THEN 1 ELSE 0 END) as null_won
FROM game_sessions
GROUP BY current_row
ORDER BY current_row;

-- ================================================
-- STEP 7: Games that are likely wins
-- ================================================
SELECT '=== 7. Games that are likely wins (game_over=true and current_row < 6) ===' as step;
SELECT
    COUNT(*) as likely_wins,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions
FROM game_sessions
WHERE game_over = true
    AND current_row < 6;

-- ================================================
-- STEP 8: Sample of likely winning games
-- ================================================
SELECT '=== 8. Sample of likely winning games ===' as step;
SELECT
    id,
    user_id,
    session_id,
    game_over,
    game_won,
    current_row,
    guesses,
    date,
    created_at
FROM game_sessions
WHERE game_over = true
    AND current_row < 6
ORDER BY created_at DESC
LIMIT 20;

-- ================================================
-- STEP 9: Check combination of game_over and game_won
-- ================================================
SELECT '=== 9. Correlation between game_over and game_won ===' as step;
SELECT
    game_over,
    game_won,
    current_row,
    COUNT(*) as count
FROM game_sessions
WHERE game_over IS NOT NULL
GROUP BY game_over, game_won, current_row
ORDER BY game_over DESC, game_won DESC, current_row;

-- ================================================
-- STEP 10: Check data types
-- ================================================
SELECT '=== 10. Column data types ===' as step;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'game_sessions'
    AND column_name IN ('game_won', 'game_over', 'current_row', 'guesses')
ORDER BY ordinal_position;

-- ================================================
-- STEP 11: Direct check for true values
-- ================================================
SELECT '=== 11. Direct check for game_won = true ===' as step;
SELECT COUNT(*) as games_marked_as_won
FROM game_sessions
WHERE game_won = true;

SELECT '=== 11b. Check with IS TRUE ===' as step;
SELECT COUNT(*) as games_marked_as_won
FROM game_sessions
WHERE game_won IS TRUE;

-- ================================================
-- STEP 12: Summary of games that should be wins
-- ================================================
SELECT '=== 12. SUMMARY - Games that should be marked as wins ===' as step;
SELECT
    'Games with game_over=true and current_row < 6' as criteria,
    COUNT(*) as count
FROM game_sessions
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false)

UNION ALL

SELECT
    'Games with guesses <= 6 and game_over=true' as criteria,
    COUNT(*) as count
FROM game_sessions
WHERE guesses IS NOT NULL
    AND guesses <= 6
    AND game_over = true
    AND (game_won IS NULL OR game_won = false)

UNION ALL

SELECT
    'Games already marked as won' as criteria,
    COUNT(*) as count
FROM game_sessions
WHERE game_won = true;

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
    'Sessions with game_over = true' as metric,
    COUNT(*)::text as value
FROM game_sessions
WHERE game_over = true
UNION ALL
SELECT
    'Likely wins (game_over=true, row<6)' as metric,
    COUNT(*)::text as value
FROM game_sessions
WHERE game_over = true AND current_row < 6;
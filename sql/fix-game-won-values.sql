-- FIX GAME_WON VALUES IN DATABASE
-- The JavaScript is saving game_won but it might not be getting set correctly

-- ================================================
-- STEP 1: Check current state of game_won column
-- ================================================
SELECT '=== 1. Current game_won distribution ===' as step;
SELECT
    game_won,
    COUNT(*) as count
FROM game_sessions
GROUP BY game_won;

-- ================================================
-- STEP 2: Look for games that SHOULD be wins
-- Games are wins when the word was guessed (board has 5 correct in a row)
-- ================================================
SELECT '=== 2. Find games with winning board patterns ===' as step;

-- First, let's see what board_state looks like
SELECT
    id,
    game_won,
    current_row,
    board_state,
    created_at
FROM game_sessions
WHERE board_state IS NOT NULL
    AND board_state != ''
    AND board_state != '[]'
ORDER BY created_at DESC
LIMIT 5;

-- ================================================
-- STEP 3: Look for games with complete rows (current_row 0-5 means 1-6 guesses)
-- ================================================
SELECT '=== 3. Games by completion status ===' as step;
SELECT
    current_row,
    game_over,
    game_won,
    COUNT(*) as count
FROM game_sessions
GROUP BY current_row, game_over, game_won
ORDER BY current_row, game_over, game_won;

-- ================================================
-- STEP 4: Check if game_over true means they completed the puzzle
-- ================================================
SELECT '=== 4. Games marked as game_over ===' as step;
SELECT
    game_over,
    game_won,
    COUNT(*) as count
FROM game_sessions
WHERE game_over = true
GROUP BY game_over, game_won;

-- ================================================
-- STEP 5: Sample of game_over = true games to verify
-- ================================================
SELECT '=== 5. Sample of completed games ===' as step;
SELECT
    id,
    user_id,
    session_id,
    game_over,
    game_won,
    current_row,
    guesses,
    created_at
FROM game_sessions
WHERE game_over = true
ORDER BY created_at DESC
LIMIT 20;

-- ================================================
-- STEP 6: UPDATE WINNERS BASED ON PATTERNS
-- If a game is marked as game_over=true and has less than 6 rows,
-- it's likely a win (they got the word before running out of guesses)
-- ================================================

-- First, let's see how many this would affect
SELECT '=== 6. Games that might be wins (game_over=true, rows < 6) ===' as step;
SELECT
    COUNT(*) as potential_wins
FROM game_sessions
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false);

-- Show sample before update
SELECT '=== 6b. Sample of potential wins ===' as step;
SELECT
    id,
    user_id,
    game_over,
    game_won,
    current_row,
    guesses,
    created_at
FROM game_sessions
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false)
LIMIT 10;

-- ================================================
-- STEP 7: SAFE UPDATE - Mark obvious wins
-- Only update if game_over is true and they used less than 6 rows
-- ================================================

-- UNCOMMENT THE FOLLOWING TO PERFORM THE UPDATE:
/*
UPDATE game_sessions
SET game_won = true
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false);
*/

-- ================================================
-- STEP 8: Alternative detection - look at board_state
-- ================================================
SELECT '=== 8. Detect wins from board_state ===' as step;

-- Look for pattern of 5 correct letters in a row
WITH potential_wins AS (
    SELECT
        id,
        user_id,
        game_won,
        current_row,
        board_state,
        -- Check if board_state contains a winning pattern
        CASE
            WHEN board_state LIKE '%["correct","correct","correct","correct","correct"]%' THEN true
            WHEN board_state LIKE '%correct%' AND board_state LIKE '%correct%correct%correct%correct%correct%' THEN true
            ELSE false
        END as has_winning_pattern
    FROM game_sessions
    WHERE board_state IS NOT NULL
        AND board_state != ''
        AND board_state != '[]'
)
SELECT
    has_winning_pattern,
    game_won,
    COUNT(*) as count
FROM potential_wins
GROUP BY has_winning_pattern, game_won;

-- ================================================
-- STEP 9: More aggressive fix - check guesses column
-- ================================================
SELECT '=== 9. Check guesses column for wins ===' as step;
SELECT
    guesses,
    game_over,
    game_won,
    COUNT(*) as count
FROM game_sessions
WHERE guesses IS NOT NULL
GROUP BY guesses, game_over, game_won
ORDER BY guesses;

-- ================================================
-- STEP 10: FINAL CHECK AFTER UPDATES
-- ================================================
SELECT '=== 10. Final game_won distribution ===' as step;
SELECT
    game_won,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users
FROM game_sessions
GROUP BY game_won;

-- ================================================
-- MANUAL WIN DETECTION QUERY
-- This will find games that are definitely wins
-- ================================================
SELECT '=== 11. Definite wins based on multiple criteria ===' as step;
SELECT
    id,
    user_id,
    session_id,
    game_over,
    game_won,
    current_row,
    guesses,
    CASE
        WHEN game_won = true THEN 'Already marked as win'
        WHEN game_over = true AND current_row < 6 THEN 'Likely win (completed before row 6)'
        WHEN game_over = true AND current_row <= 5 THEN 'Possible win'
        WHEN guesses IS NOT NULL AND guesses <= 6 THEN 'Guesses suggest win'
        ELSE 'Not a win'
    END as win_analysis,
    created_at
FROM game_sessions
WHERE game_over = true
    OR guesses IS NOT NULL
ORDER BY created_at DESC
LIMIT 30;

-- ================================================
-- RECOMMENDED FIX:
-- Run this to mark obvious wins
-- ================================================
/*
-- Fix 1: Mark games as wins if game_over=true and they didn't use all 6 rows
UPDATE game_sessions
SET game_won = true,
    updated_at = NOW()
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false);

-- Fix 2: Mark games as wins if they have 6 or fewer guesses recorded
UPDATE game_sessions
SET game_won = true,
    updated_at = NOW()
WHERE guesses IS NOT NULL
    AND guesses <= 6
    AND game_over = true
    AND (game_won IS NULL OR game_won = false);
*/

SELECT '=== SUMMARY: Run the UPDATE statements above to fix wins ===' as info;
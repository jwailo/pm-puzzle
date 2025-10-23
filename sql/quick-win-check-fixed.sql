-- CORRECTED QUICK CHECK: Find and fix winning games
-- Fixed to handle guesses as an array type

-- 1. How many games are marked as won?
SELECT 'Current wins in database:' as info, COUNT(*) as count
FROM game_sessions
WHERE game_won = true;

-- 2. How many games SHOULD be wins?
-- A game is won if game_over=true and they used less than 6 rows (0-5 means 1-6 guesses)
SELECT 'Games that should be wins (game_over=true, used < 6 rows):' as info, COUNT(*) as count
FROM game_sessions
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false);

-- 3. Show sample of games that should be wins
SELECT 'Sample of games that should be marked as wins:' as info;
SELECT
    id,
    user_id,
    session_id,
    game_over,
    game_won,
    current_row,
    array_length(guesses, 1) as num_guesses,
    date,
    created_at
FROM game_sessions
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false)
LIMIT 10;

-- 4. Alternative check - using array_length for guesses
SELECT 'Games with 6 or fewer guesses that should be wins:' as info, COUNT(*) as count
FROM game_sessions
WHERE game_over = true
    AND array_length(guesses, 1) <= 6
    AND array_length(guesses, 1) > 0
    AND (game_won IS NULL OR game_won = false);

-- 5. THE FIX: Update games to mark them as won
-- This marks as won if:
-- - game_over is true
-- - current_row < 6 (they didn't use all 6 rows)
-- RUN THIS TO FIX THE DATA:

UPDATE game_sessions
SET game_won = true,
    updated_at = NOW()
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false);

-- 6. After running the update, verify the results:
SELECT 'After fix - Total wins:' as info, COUNT(*) as count
FROM game_sessions
WHERE game_won = true;
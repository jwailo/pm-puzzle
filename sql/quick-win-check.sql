-- QUICK CHECK: Find and fix winning games

-- 1. How many games are marked as won?
SELECT 'Current wins in database:' as info, COUNT(*) as count
FROM game_sessions
WHERE game_won = true;

-- 2. How many games SHOULD be wins?
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
    date,
    created_at
FROM game_sessions
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false)
LIMIT 10;

-- 4. FIX: Update games to mark them as won
-- UNCOMMENT AND RUN THIS TO FIX:
/*
UPDATE game_sessions
SET game_won = true,
    updated_at = NOW()
WHERE game_over = true
    AND current_row < 6
    AND (game_won IS NULL OR game_won = false);
*/

-- 5. After running the update, check the results:
SELECT 'After fix - Total wins:' as info, COUNT(*) as count
FROM game_sessions
WHERE game_won = true;
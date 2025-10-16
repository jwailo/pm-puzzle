-- Check for any remaining Player X entries in the database
-- Run these queries to identify if there are any leftover test entries

-- ============================================
-- STEP 1: Check user_profiles for Player X names
-- ============================================
SELECT id, email, first_name, created_at
FROM user_profiles
WHERE first_name LIKE 'Player %'
   OR first_name ~ '^Player \d+$'  -- Matches "Player" followed by numbers
ORDER BY created_at;

-- Count how many Player X entries exist
SELECT COUNT(*) as player_x_count
FROM user_profiles
WHERE first_name LIKE 'Player %';

-- ============================================
-- STEP 2: Check for orphaned user_stats records
-- ============================================
-- Find user_stats records without corresponding user_profiles
SELECT us.*
FROM user_stats us
LEFT JOIN user_profiles up ON us.user_id = up.id
WHERE up.id IS NULL;

-- Count orphaned records
SELECT COUNT(*) as orphaned_stats_count
FROM user_stats us
LEFT JOIN user_profiles up ON us.user_id = up.id
WHERE up.id IS NULL;

-- ============================================
-- STEP 3: Check current streak leaderboard
-- ============================================
-- See what the leaderboard function returns
SELECT * FROM get_public_streak_leaderboard();

-- ============================================
-- STEP 4: Optional - Remove Player X entries
-- ============================================
-- ONLY RUN IF YOU WANT TO DELETE THESE ENTRIES

-- First delete related records
DELETE FROM user_stats
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE first_name LIKE 'Player %'
);

DELETE FROM game_sessions
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE first_name LIKE 'Player %'
);

DELETE FROM daily_completions
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE first_name LIKE 'Player %'
);

-- Then delete the user profiles
DELETE FROM user_profiles
WHERE first_name LIKE 'Player %';

-- Verify deletion
SELECT COUNT(*) as should_be_zero
FROM user_profiles
WHERE first_name LIKE 'Player %';
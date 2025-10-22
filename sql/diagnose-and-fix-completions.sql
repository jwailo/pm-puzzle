-- COMPREHENSIVE DIAGNOSTIC AND FIX FOR COMPLETIONS
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: DIAGNOSTICS - Find out what data exists
-- ============================================

-- 1. Check structure of game_sessions table
SELECT '=== GAME_SESSIONS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'game_sessions'
ORDER BY ordinal_position;

-- 2. Check how many winning game sessions exist
SELECT '=== GAME SESSIONS SUMMARY ===' as info;
SELECT
    COUNT(*) as total_sessions,
    SUM(CASE WHEN game_won = true THEN 1 ELSE 0 END) as won_sessions,
    SUM(CASE WHEN game_won = true AND user_id IS NOT NULL THEN 1 ELSE 0 END) as won_by_registered_users,
    COUNT(DISTINCT user_id) as unique_registered_users,
    COUNT(DISTINCT date) as unique_dates_played
FROM game_sessions;

-- 3. Show sample of winning sessions
SELECT '=== SAMPLE WINNING SESSIONS (Last 20) ===' as info;
SELECT
    gs.id,
    gs.date,
    gs.user_id,
    gs.game_won,
    gs.current_row,
    up.email,
    up.first_name,
    gs.created_at,
    gs.updated_at
FROM game_sessions gs
LEFT JOIN user_profiles up ON gs.user_id = up.id
WHERE gs.game_won = true
    AND gs.user_id IS NOT NULL
ORDER BY gs.date DESC NULLS LAST, gs.created_at DESC
LIMIT 20;

-- 4. Check if dates are NULL
SELECT '=== CHECK FOR NULL DATES ===' as info;
SELECT
    COUNT(*) as total_wins,
    SUM(CASE WHEN date IS NULL THEN 1 ELSE 0 END) as wins_with_null_date,
    SUM(CASE WHEN date IS NOT NULL THEN 1 ELSE 0 END) as wins_with_valid_date
FROM game_sessions
WHERE game_won = true AND user_id IS NOT NULL;

-- 5. Show date distribution
SELECT '=== WINS BY DATE (Last 30 days) ===' as info;
SELECT
    COALESCE(date, created_at::date) as game_date,
    COUNT(*) as total_wins,
    COUNT(DISTINCT user_id) as unique_winners
FROM game_sessions
WHERE game_won = true
    AND user_id IS NOT NULL
    AND (date >= CURRENT_DATE - INTERVAL '30 days' OR created_at >= CURRENT_DATE - INTERVAL '30 days')
GROUP BY COALESCE(date, created_at::date)
ORDER BY game_date DESC;

-- ============================================
-- PART 2: FIX THE FUNCTION
-- ============================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();

-- Create a working function that handles all edge cases
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
        COALESCE(gs.date, gs.created_at::DATE) as completion_date,
        gs.user_id,
        COALESCE(up.email, 'Unknown Email') as email,
        COALESCE(up.first_name, 'Unknown User') as first_name,
        COALESCE(gs.updated_at, gs.created_at) as completed_at,
        COALESCE(gs.current_row + 1, 6) as guesses
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL
    ORDER BY COALESCE(gs.date, gs.created_at::DATE) DESC,
             COALESCE(gs.updated_at, gs.created_at) ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon, authenticated;

-- ============================================
-- PART 3: TEST THE FUNCTION
-- ============================================

-- Test if the function returns data
SELECT '=== FUNCTION TEST - Total Completions ===' as info;
SELECT COUNT(*) as total_completions_returned
FROM get_daily_puzzle_completions();

-- Show sample from function
SELECT '=== FUNCTION TEST - Sample Data ===' as info;
SELECT *
FROM get_daily_puzzle_completions()
LIMIT 20;

-- Show grouped by date
SELECT '=== FUNCTION TEST - Grouped by Date ===' as info;
SELECT
    completion_date,
    COUNT(*) as completions_count,
    STRING_AGG(first_name || ' (' || email || ')', ', ' ORDER BY first_name) as users
FROM get_daily_puzzle_completions()
GROUP BY completion_date
ORDER BY completion_date DESC
LIMIT 10;

-- ============================================
-- PART 4: ALTERNATIVE IF ABOVE DOESN'T WORK
-- ============================================

-- If the above function still returns no data, try this simpler version
CREATE OR REPLACE FUNCTION get_all_puzzle_completions()
RETURNS TABLE (
    completion_date DATE,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    guesses INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        COALESCE(gs.date, gs.created_at::DATE) as completion_date,
        gs.user_id,
        COALESCE(up.email, 'No Email') as email,
        COALESCE(up.first_name, 'No Name') as first_name,
        gs.created_at as completed_at,
        gs.current_row + 1 as guesses
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
    ORDER BY gs.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_all_puzzle_completions() TO anon, authenticated;

-- Test the alternative function
SELECT '=== ALTERNATIVE FUNCTION TEST ===' as info;
SELECT COUNT(*) as total_from_alternative
FROM get_all_puzzle_completions();

-- ============================================
-- PART 5: DIRECT QUERY TO VERIFY DATA EXISTS
-- ============================================

SELECT '=== DIRECT QUERY - All Winning Sessions ===' as info;
SELECT
    gs.date,
    gs.created_at,
    gs.user_id,
    up.email,
    up.first_name,
    gs.game_won,
    gs.current_row + 1 as guesses
FROM game_sessions gs
LEFT JOIN user_profiles up ON gs.user_id = up.id
WHERE gs.game_won = true
ORDER BY gs.created_at DESC
LIMIT 50;
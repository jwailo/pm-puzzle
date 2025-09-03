-- Data Integrity Check and Recovery Script
-- Run this in Supabase SQL Editor to check for data issues

-- 1. Check for users with suspicious stats (likely affected by double-saving)
SELECT 
    up.first_name,
    us.games_played,
    us.games_won,
    us.current_streak,
    us.max_streak,
    us.updated_at
FROM user_stats us
LEFT JOIN user_profiles up ON us.user_id = up.id
WHERE us.current_streak > us.max_streak  -- Impossible state
   OR us.games_won > us.games_played     -- Impossible state
   OR us.max_streak > 100                -- Suspiciously high
ORDER BY us.max_streak DESC;

-- 2. Check for users with missing user_profiles
SELECT us.user_id, us.games_played, us.games_won, us.max_streak
FROM user_stats us
LEFT JOIN user_profiles up ON us.user_id = up.id
WHERE up.id IS NULL;

-- 3. Check for duplicate daily leaderboard entries (shouldn't exist)
SELECT user_id, date, COUNT(*) as duplicate_count
FROM daily_leaderboard
GROUP BY user_id, date
HAVING COUNT(*) > 1;

-- 4. Show current leaderboard status
SELECT 
    'Daily Leaderboard' as type,
    COUNT(*) as total_entries,
    COUNT(DISTINCT user_id) as unique_users
FROM daily_leaderboard
WHERE date = CURRENT_DATE

UNION ALL

SELECT 
    'User Stats' as type,
    COUNT(*) as total_entries,
    COUNT(DISTINCT user_id) as unique_users
FROM user_stats
WHERE max_streak > 0;

-- 5. Recovery function to fix impossible stats
CREATE OR REPLACE FUNCTION fix_corrupted_stats()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    fixed_count INTEGER := 0;
BEGIN
    -- Fix impossible current_streak > max_streak
    UPDATE user_stats 
    SET max_streak = current_streak
    WHERE current_streak > max_streak;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    -- Fix impossible games_won > games_played
    UPDATE user_stats 
    SET games_played = games_won
    WHERE games_won > games_played;
    
    GET DIAGNOSTICS fixed_count = fixed_count + ROW_COUNT;
    
    -- Cap suspiciously high streaks (likely double-counted)
    UPDATE user_stats 
    SET max_streak = GREATEST(1, max_streak / 2),
        current_streak = GREATEST(0, LEAST(current_streak, max_streak / 2))
    WHERE max_streak > 50; -- Adjust threshold as needed
    
    GET DIAGNOSTICS fixed_count = fixed_count + ROW_COUNT;
    
    RETURN 'Fixed ' || fixed_count || ' corrupted stat records';
END;
$$;
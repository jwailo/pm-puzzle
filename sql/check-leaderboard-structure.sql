-- CHECK WHAT get_public_daily_leaderboard ACTUALLY RETURNS

-- 1. Test the function for today's date
SELECT * FROM get_public_daily_leaderboard('2025-10-23');

-- 2. Check the structure of what it returns
SELECT
    user_id,
    completion_time,
    guesses,
    user_profiles
FROM get_public_daily_leaderboard('2025-10-23')
LIMIT 5;

-- 3. Check if user_profiles is included properly
-- The function might return user_profiles as a JSON field
SELECT
    user_id,
    completion_time,
    guesses,
    user_profiles->>'first_name' as first_name,
    user_profiles->>'email' as email
FROM get_public_daily_leaderboard('2025-10-22')
WHERE user_profiles IS NOT NULL
LIMIT 10;
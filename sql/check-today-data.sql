-- CHECK: Today's data (Oct 24 Sydney = Oct 23 database)

-- 1. Check if anyone has completed today's puzzle (Oct 24 Sydney time)
-- In the database this is Oct 23
SELECT COUNT(*) as completions_today_sydney
FROM daily_completions
WHERE puzzle_date = '2025-10-23';

-- 2. If yes, show them
SELECT
    user_id,
    time_seconds,
    guesses,
    created_at AT TIME ZONE 'Australia/Sydney' as completed_at_sydney
FROM daily_completions
WHERE puzzle_date = '2025-10-23'
ORDER BY time_seconds ASC;

-- 3. Test our function for Oct 23 (today in database, Oct 24 in Sydney)
SELECT COUNT(*) as function_count_for_today
FROM get_public_daily_leaderboard('2025-10-23'::DATE);

-- 4. Show the leaderboard for today
SELECT
    ROW_NUMBER() OVER (ORDER BY completion_time ASC) as rank,
    user_profiles->>'first_name' as name,
    user_profiles->>'email' as email,
    completion_time,
    guesses
FROM get_public_daily_leaderboard('2025-10-23'::DATE)
ORDER BY completion_time ASC;
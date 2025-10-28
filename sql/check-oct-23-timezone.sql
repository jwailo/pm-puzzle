-- CHECK: Is Oct 23 data hidden due to timezone issues?

-- 1. Check if there's any data being recorded today (Oct 24)
SELECT
    puzzle_date,
    COUNT(*) as count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM daily_completions
WHERE puzzle_date >= '2025-10-22'
GROUP BY puzzle_date
ORDER BY puzzle_date DESC;

-- 2. Check the timestamps for Oct 22 entries (might include Oct 23 AEST)
SELECT
    puzzle_date,
    created_at,
    created_at AT TIME ZONE 'Australia/Sydney' as sydney_time,
    user_id,
    time_seconds
FROM daily_completions
WHERE puzzle_date = '2025-10-22'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if any entries were created on Oct 23 (by created_at timestamp)
SELECT
    puzzle_date as stored_date,
    DATE(created_at AT TIME ZONE 'Australia/Sydney') as created_date_sydney,
    COUNT(*) as count
FROM daily_completions
WHERE created_at >= '2025-10-23 00:00:00'
GROUP BY puzzle_date, DATE(created_at AT TIME ZONE 'Australia/Sydney')
ORDER BY created_date_sydney DESC;

-- 4. The function we created - let's test it for Oct 22 (which we know has data)
SELECT COUNT(*) as oct_22_function_count
FROM get_public_daily_leaderboard('2025-10-22'::DATE);

-- 5. Get sample data from the function for Oct 22
SELECT
    user_profiles->>'first_name' as name,
    completion_time,
    guesses
FROM get_public_daily_leaderboard('2025-10-22'::DATE)
ORDER BY completion_time ASC
LIMIT 5;

-- 6. Now let's check CURRENT_DATE in the database
SELECT
    CURRENT_DATE as db_current_date,
    NOW() as db_current_timestamp,
    NOW() AT TIME ZONE 'Australia/Sydney' as sydney_now;
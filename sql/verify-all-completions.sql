-- VERIFY: The function now returns ALL completions, not just top 10

-- 1. For Oct 22 (which is really Oct 23 Sydney time), verify we get ALL 34 completions
SELECT COUNT(*) as function_returns_count
FROM get_public_daily_leaderboard('2025-10-22'::DATE);

-- 2. Get ALL the Oct 22 completions to verify they're all there
SELECT
    ROW_NUMBER() OVER (ORDER BY completion_time ASC) as rank,
    user_profiles->>'first_name' as name,
    completion_time,
    guesses
FROM get_public_daily_leaderboard('2025-10-22'::DATE)
ORDER BY completion_time ASC;

-- 3. For TODAY in Sydney (Oct 24), the database date is Oct 23
-- So to see TODAY's Sydney completions, we need to check Oct 23:
SELECT COUNT(*) as today_sydney_completions
FROM get_public_daily_leaderboard('2025-10-23'::DATE);

-- 4. If there are any, show them:
SELECT
    user_profiles->>'first_name' as name,
    completion_time,
    guesses
FROM get_public_daily_leaderboard('2025-10-23'::DATE)
ORDER BY completion_time ASC;

-- 5. Summary: Map database dates to Sydney dates
SELECT
    '2025-10-22 in DB = Oct 23 in Sydney' as date_mapping,
    COUNT(*) as completions
FROM daily_completions
WHERE puzzle_date = '2025-10-22'
UNION ALL
SELECT
    '2025-10-23 in DB = Oct 24 in Sydney (today)' as date_mapping,
    COUNT(*) as completions
FROM daily_completions
WHERE puzzle_date = '2025-10-23';
-- VERIFY: All 34 completions show for Oct 22 (Sydney Oct 23)

-- 1. Confirm we get ALL 34 completions from the function
SELECT COUNT(*) as total_returned
FROM get_public_daily_leaderboard('2025-10-22'::DATE);

-- 2. Show ALL completions with rank to verify none are cut off
SELECT
    ROW_NUMBER() OVER (ORDER BY completion_time ASC) as rank,
    user_profiles->>'first_name' as name,
    completion_time,
    guesses
FROM get_public_daily_leaderboard('2025-10-22'::DATE)
ORDER BY completion_time ASC;

-- 3. Verify the last few entries (should see ranks 31-34 if all are included)
SELECT
    ROW_NUMBER() OVER (ORDER BY completion_time ASC) as rank,
    user_profiles->>'first_name' as name,
    completion_time
FROM get_public_daily_leaderboard('2025-10-22'::DATE)
ORDER BY completion_time DESC
LIMIT 5;
-- DIAGNOSE: Why October 23 completions aren't showing

-- 1. Check what's actually in the daily_completions table
SELECT COUNT(*) as total_records
FROM daily_completions;

-- 2. See the actual puzzle_date values stored
SELECT DISTINCT puzzle_date, COUNT(*) as count
FROM daily_completions
ORDER BY puzzle_date DESC
LIMIT 10;

-- 3. Check if the dates are stored as timestamps or dates
SELECT
    puzzle_date,
    pg_typeof(puzzle_date) as data_type,
    user_id,
    time_seconds,
    guesses
FROM daily_completions
ORDER BY puzzle_date DESC
LIMIT 5;

-- 4. Check for October 23 with different date formats
SELECT COUNT(*) as oct_23_like
FROM daily_completions
WHERE puzzle_date::TEXT LIKE '2025-10-23%';

-- 5. Check the actual structure of the table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'daily_completions'
ORDER BY ordinal_position;

-- 6. Get raw data for recent completions
SELECT
    puzzle_date,
    puzzle_date::TEXT as date_as_text,
    user_id,
    puzzle_word,
    time_seconds,
    guesses,
    completed_at,
    created_at
FROM daily_completions
WHERE puzzle_date >= '2025-10-20'::DATE
ORDER BY puzzle_date DESC, time_seconds ASC;

-- 7. Check if it's a timezone issue (AEST is UTC+11)
SELECT
    puzzle_date AT TIME ZONE 'Australia/Sydney' as sydney_time,
    puzzle_date as stored_date,
    user_id
FROM daily_completions
WHERE puzzle_date >= '2025-10-22'::DATE
    OR puzzle_date >= '2025-10-22'::DATE - INTERVAL '1 day'
ORDER BY puzzle_date DESC
LIMIT 10;

-- 8. Count records that might be October 23 in AEST
SELECT COUNT(*) as possible_oct_23
FROM daily_completions
WHERE puzzle_date >= '2025-10-22'::DATE
    AND puzzle_date < '2025-10-24'::DATE;

-- 9. See all unique dates in October
SELECT DISTINCT DATE(puzzle_date) as puzzle_day, COUNT(*) as completions
FROM daily_completions
WHERE EXTRACT(MONTH FROM puzzle_date) = 10
    AND EXTRACT(YEAR FROM puzzle_date) = 2025
GROUP BY DATE(puzzle_date)
ORDER BY puzzle_day DESC;
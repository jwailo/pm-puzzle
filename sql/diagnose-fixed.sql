-- DIAGNOSE: Better version with proper SQL

-- 1. First, just check if there's ANY data at all
SELECT COUNT(*) as total_records FROM daily_completions;

-- 2. Get a sample of raw data to see what we're dealing with
SELECT * FROM daily_completions LIMIT 5;

-- 3. See unique dates properly with GROUP BY
SELECT
    puzzle_date,
    COUNT(*) as count
FROM daily_completions
GROUP BY puzzle_date
ORDER BY puzzle_date DESC
LIMIT 10;

-- 4. Check data type of puzzle_date column
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'daily_completions'
    AND column_name = 'puzzle_date';

-- 5. Look for any October 2025 data
SELECT *
FROM daily_completions
WHERE puzzle_date >= '2025-10-01'
    AND puzzle_date < '2025-11-01'
ORDER BY puzzle_date DESC
LIMIT 10;

-- 6. Check if maybe the year is different (2024 instead of 2025?)
SELECT
    EXTRACT(YEAR FROM puzzle_date) as year,
    EXTRACT(MONTH FROM puzzle_date) as month,
    COUNT(*) as records
FROM daily_completions
GROUP BY EXTRACT(YEAR FROM puzzle_date), EXTRACT(MONTH FROM puzzle_date)
ORDER BY year DESC, month DESC;

-- 7. Get the most recent dates in the table
SELECT
    puzzle_date,
    COUNT(*) as completions_count
FROM daily_completions
GROUP BY puzzle_date
ORDER BY puzzle_date DESC
LIMIT 5;
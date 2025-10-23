-- CHECK WHAT ACTUALLY WORKS IN THE DATABASE

-- 1. Check the user_stats table structure (this is what the admin uses)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY ordinal_position;

-- 2. Check what get_admin_user_list returns (this WORKS in the admin)
SELECT * FROM get_admin_user_list() LIMIT 5;

-- 3. Check actual user_stats data
SELECT * FROM user_stats
WHERE games_played > 0
LIMIT 5;

-- 4. Check if there's a last_completed or updated_at we can use
SELECT
    user_id,
    games_played,
    games_won,
    current_streak,
    longest_streak,
    last_completed,
    created_at,
    updated_at
FROM user_stats
WHERE games_played > 0
ORDER BY updated_at DESC
LIMIT 10;
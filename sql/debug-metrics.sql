-- DEBUG: Why are metrics showing 0?

-- 1. Check user_profiles count (should be 80)
SELECT COUNT(*) as registered_users_count
FROM user_profiles;

-- 2. Check user_stats structure and data
SELECT
    COUNT(*) as total_rows,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN last_played IS NOT NULL THEN 1 END) as users_with_last_played,
    COUNT(CASE WHEN last_completed IS NOT NULL THEN 1 END) as users_with_last_completed
FROM user_stats;

-- 3. Check what date columns exist in user_stats
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_stats'
AND column_name LIKE '%last%' OR column_name LIKE '%date%'
ORDER BY ordinal_position;

-- 4. Sample of user_stats to see actual data
SELECT user_id, games_played, last_played, last_completed, updated_at
FROM user_stats
WHERE games_played > 0
LIMIT 5;

-- 5. Check active users using different date fields
SELECT
    'Using last_played' as method,
    COUNT(CASE WHEN last_played >= CURRENT_DATE THEN 1 END) as today,
    COUNT(CASE WHEN last_played >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN last_played >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days
FROM user_stats

UNION ALL

SELECT
    'Using last_completed' as method,
    COUNT(CASE WHEN last_completed >= CURRENT_DATE THEN 1 END) as today,
    COUNT(CASE WHEN last_completed >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN last_completed >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days
FROM user_stats

UNION ALL

SELECT
    'Using updated_at' as method,
    COUNT(CASE WHEN updated_at >= CURRENT_DATE THEN 1 END) as today,
    COUNT(CASE WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN updated_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days
FROM user_stats;

-- 6. Guest sessions check
SELECT COUNT(DISTINCT session_id) as unique_guest_sessions
FROM user_stats
WHERE user_id IS NULL AND session_id IS NOT NULL;
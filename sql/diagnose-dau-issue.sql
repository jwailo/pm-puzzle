-- Diagnostic queries to understand why DAU is showing 28

-- 1. Check what the function is returning
SELECT get_admin_active_users(1) as current_dau_count;

-- 2. See the raw data being counted for today
SELECT
    'Unique players today' as metric,
    COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as count
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '1 day';

-- 3. Break down by registered vs guest
SELECT
    CASE
        WHEN user_id IS NOT NULL THEN 'Registered User'
        ELSE 'Guest'
    END as user_type,
    COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as unique_players,
    COUNT(*) as total_sessions
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '1 day'
GROUP BY user_type;

-- 4. List all activity in the last 24 hours with details
SELECT
    created_at,
    user_id,
    session_id,
    CASE
        WHEN user_id IS NOT NULL THEN 'Registered'
        ELSE 'Guest'
    END as user_type
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 50;

-- 5. Check for duplicate session IDs or unusual patterns
SELECT
    session_id,
    COUNT(*) as session_count,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen,
    COUNT(DISTINCT user_id) as different_users
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '1 day'
  AND session_id IS NOT NULL
GROUP BY session_id
HAVING COUNT(*) > 1
ORDER BY session_count DESC;

-- 6. Check if there are test/bot sessions creating noise
SELECT
    DATE(created_at) as date,
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as sessions_count,
    COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as unique_players
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '2 days'
GROUP BY DATE(created_at), EXTRACT(HOUR FROM created_at)
ORDER BY date DESC, hour DESC;

-- 7. Check for suspicious patterns - same session_id across many days
SELECT
    session_id,
    COUNT(DISTINCT DATE(created_at)) as days_active,
    COUNT(*) as total_sessions,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM game_sessions
WHERE session_id IS NOT NULL
GROUP BY session_id
HAVING COUNT(DISTINCT DATE(created_at)) > 1
ORDER BY days_active DESC
LIMIT 20;

-- 8. The actual issue might be timezone - let's check with local timezone
SELECT
    'DAU (Server Time)' as metric,
    COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as count
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '1 day'
UNION ALL
SELECT
    'DAU (Today Only)' as metric,
    COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as count
FROM game_sessions
WHERE DATE(created_at) = CURRENT_DATE
UNION ALL
SELECT
    'DAU (Yesterday Only)' as metric,
    COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as count
FROM game_sessions
WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day';

-- 9. Show breakdown by actual dates
SELECT
    DATE(created_at) as play_date,
    COUNT(DISTINCT COALESCE(user_id, session_id::uuid)) as unique_players,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as registered_players,
    COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL) as guest_players,
    COUNT(*) as total_sessions
FROM game_sessions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY play_date DESC;
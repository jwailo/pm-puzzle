-- ANALYZE WHAT DATA WE'RE ACTUALLY CAPTURING ACCURATELY
-- No guessing, no estimates - just facts

-- 1. USER_PROFILES: What do we know for certain about registered users?
SELECT
    COUNT(*) as total_registered_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as users_with_name,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as registered_last_7_days,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as registered_last_30_days,
    MIN(created_at::DATE) as first_registration,
    MAX(created_at::DATE) as latest_registration
FROM user_profiles;

-- 2. USER_STATS: What gameplay data is accurately tracked?
SELECT
    COUNT(DISTINCT user_id) as users_with_stats,
    COUNT(CASE WHEN games_played > 0 THEN 1 END) as users_who_played,
    COUNT(CASE WHEN games_won > 0 THEN 1 END) as users_who_won,
    SUM(games_played) as total_games_across_all_users,
    SUM(games_won) as total_wins_across_all_users,
    AVG(CASE WHEN games_played > 0 THEN games_played END)::DECIMAL(10,1) as avg_games_per_active_user,
    MAX(games_played) as most_games_by_single_user,
    MAX(current_streak) as longest_active_streak,
    MAX(max_streak) as longest_ever_streak
FROM user_stats;

-- 3. DAILY_COMPLETIONS: What do we know about actual puzzle completions?
SELECT
    COUNT(*) as total_puzzle_completions,
    COUNT(DISTINCT user_id) as unique_users_who_completed,
    COUNT(DISTINCT puzzle_date) as days_with_completions,
    COUNT(DISTINCT puzzle_word) as unique_words_played,
    AVG(guesses)::DECIMAL(10,1) as avg_guesses_to_win,
    AVG(time_seconds)::DECIMAL(10,0) as avg_seconds_to_complete,
    MIN(puzzle_date) as first_puzzle_date,
    MAX(puzzle_date) as most_recent_puzzle_date,
    (MAX(puzzle_date) - MIN(puzzle_date))::INTEGER + 1 as days_since_launch
FROM daily_completions
WHERE user_id IS NOT NULL;  -- Only registered users

-- 4. ENGAGEMENT PATTERNS: What can we measure without guessing?
WITH user_engagement AS (
    SELECT
        us.user_id,
        us.games_played,
        us.games_won,
        us.last_played,
        CASE
            WHEN us.last_played >= CURRENT_DATE - INTERVAL '7 days' THEN 'active'
            WHEN us.last_played >= CURRENT_DATE - INTERVAL '30 days' THEN 'recent'
            WHEN us.last_played >= CURRENT_DATE - INTERVAL '90 days' THEN 'dormant'
            ELSE 'inactive'
        END as engagement_status,
        CASE
            WHEN us.games_played = 0 THEN 'never_played'
            WHEN us.games_played = 1 THEN 'tried_once'
            WHEN us.games_played <= 5 THEN 'casual'
            WHEN us.games_played <= 20 THEN 'regular'
            ELSE 'dedicated'
        END as player_type
    FROM user_stats us
)
SELECT
    engagement_status,
    player_type,
    COUNT(*) as user_count,
    SUM(games_played) as total_games,
    AVG(games_played)::DECIMAL(10,1) as avg_games
FROM user_engagement
GROUP BY engagement_status, player_type
ORDER BY
    CASE engagement_status
        WHEN 'active' THEN 1
        WHEN 'recent' THEN 2
        WHEN 'dormant' THEN 3
        ELSE 4
    END,
    user_count DESC;

-- 5. DAILY ACTIVITY: What's the actual daily usage pattern?
WITH daily_stats AS (
    SELECT
        puzzle_date,
        COUNT(DISTINCT user_id) as daily_players,
        COUNT(*) as daily_completions,
        AVG(guesses)::DECIMAL(10,1) as avg_guesses,
        AVG(time_seconds)::DECIMAL(10,0) as avg_time
    FROM daily_completions
    WHERE puzzle_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY puzzle_date
)
SELECT
    AVG(daily_players)::DECIMAL(10,1) as avg_daily_players,
    MAX(daily_players) as peak_daily_players,
    MIN(daily_players) as min_daily_players,
    COUNT(CASE WHEN daily_players > 0 THEN 1 END) as days_with_activity,
    COUNT(*) as total_days,
    (COUNT(CASE WHEN daily_players > 0 THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100)::DECIMAL(10,1) as percent_days_active
FROM daily_stats;

-- 6. WIN RATE AND DIFFICULTY: Measurable game metrics
SELECT
    'Win Rate' as metric,
    (SUM(games_won)::DECIMAL / NULLIF(SUM(games_played), 0) * 100)::DECIMAL(10,1) as value
FROM user_stats
WHERE games_played > 0

UNION ALL

SELECT
    'Avg Guesses to Win' as metric,
    AVG(guesses)::DECIMAL(10,1) as value
FROM daily_completions

UNION ALL

SELECT
    'Avg Time to Complete (seconds)' as metric,
    AVG(time_seconds)::DECIMAL(10,0) as value
FROM daily_completions
WHERE time_seconds > 0 AND time_seconds < 3600  -- Exclude outliers

UNION ALL

SELECT
    'Perfect Games (1 guess)' as metric,
    COUNT(*)::DECIMAL as value
FROM daily_completions
WHERE guesses = 1;

-- 7. RETENTION: What we can actually measure
WITH first_game AS (
    SELECT
        user_id,
        MIN(DATE(created_at)) as first_play_date
    FROM user_stats
    WHERE games_played > 0
    GROUP BY user_id
),
return_play AS (
    SELECT
        fg.user_id,
        fg.first_play_date,
        CASE WHEN us.games_played > 1 THEN 1 ELSE 0 END as returned,
        CASE WHEN us.last_played >= fg.first_play_date + INTERVAL '1 day' THEN 1 ELSE 0 END as played_next_day,
        CASE WHEN us.last_played >= fg.first_play_date + INTERVAL '7 days' THEN 1 ELSE 0 END as played_after_week
    FROM first_game fg
    JOIN user_stats us ON fg.user_id = us.user_id
)
SELECT
    COUNT(*) as total_users_who_played,
    SUM(returned) as users_who_played_again,
    SUM(played_next_day) as users_who_returned_next_day,
    SUM(played_after_week) as users_still_playing_after_week,
    (SUM(returned)::DECIMAL / COUNT(*)::DECIMAL * 100)::DECIMAL(10,1) as return_rate_percent,
    (SUM(played_next_day)::DECIMAL / COUNT(*)::DECIMAL * 100)::DECIMAL(10,1) as next_day_retention_percent,
    (SUM(played_after_week)::DECIMAL / COUNT(*)::DECIMAL * 100)::DECIMAL(10,1) as week_retention_percent
FROM return_play;
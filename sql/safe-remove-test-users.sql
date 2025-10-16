-- SAFE VERSION: Run these queries one by one to safely remove test users

-- ============================================
-- STEP 1: VIEW USERS TO BE REMOVED
-- ============================================
-- Run this first to see which users will be deleted
SELECT id, email, first_name, created_at
FROM user_profiles
WHERE email LIKE '%+%'  -- Contains a plus sign (usually test accounts)
   OR email = 'lecose5513@fanwn.com'  -- Specific user to remove
ORDER BY created_at;

-- ============================================
-- STEP 2: COUNT AFFECTED USERS
-- ============================================
-- See how many users will be removed
SELECT
    COUNT(*) as total_to_remove,
    COUNT(CASE WHEN email LIKE '%+%' THEN 1 END) as plus_sign_emails,
    COUNT(CASE WHEN email = 'lecose5513@fanwn.com' THEN 1 END) as specific_email
FROM user_profiles
WHERE email LIKE '%+%'
   OR email = 'lecose5513@fanwn.com';

-- ============================================
-- STEP 3: BACKUP USER DATA (Optional but recommended)
-- ============================================
-- Export/backup these users before deletion
SELECT
    up.*,
    us.games_played,
    us.games_won,
    us.current_streak,
    us.max_streak
FROM user_profiles up
LEFT JOIN user_stats us ON up.id = us.user_id
WHERE up.email LIKE '%+%'
   OR up.email = 'lecose5513@fanwn.com';

-- ============================================
-- STEP 4: DELETE FROM DEPENDENT TABLES
-- ============================================
-- Must delete from tables with foreign keys first

-- 4a. Delete from user_stats
DELETE FROM user_stats
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE email LIKE '%+%'
       OR email = 'lecose5513@fanwn.com'
);

-- 4b. Delete from game_sessions
DELETE FROM game_sessions
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE email LIKE '%+%'
       OR email = 'lecose5513@fanwn.com'
);

-- 4c. Delete from daily_completions
DELETE FROM daily_completions
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE email LIKE '%+%'
       OR email = 'lecose5513@fanwn.com'
);

-- 4d. Delete from share_events
DELETE FROM share_events
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE email LIKE '%+%'
       OR email = 'lecose5513@fanwn.com'
);

-- ============================================
-- STEP 5: DELETE THE USERS
-- ============================================
-- Finally delete from the main user_profiles table
DELETE FROM user_profiles
WHERE email LIKE '%+%'
   OR email = 'lecose5513@fanwn.com';

-- ============================================
-- STEP 6: VERIFY DELETION
-- ============================================
-- Should return 0 rows if successful
SELECT COUNT(*) as should_be_zero
FROM user_profiles
WHERE email LIKE '%+%'
   OR email = 'lecose5513@fanwn.com';

-- ============================================
-- STEP 7: CHECK REMAINING USERS
-- ============================================
-- View stats about remaining users
SELECT
    COUNT(*) as total_remaining_users,
    COUNT(DISTINCT email) as unique_emails,
    MIN(created_at) as earliest_signup,
    MAX(created_at) as latest_signup
FROM user_profiles;

-- List remaining users (optional)
SELECT email, first_name, created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 50;
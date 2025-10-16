-- First, let's identify the users to be removed
-- This will show you which users will be deleted before actually deleting them

-- Step 1: View users that will be removed
SELECT id, email, first_name, created_at
FROM user_profiles
WHERE email LIKE '%+%'  -- Contains a plus sign (usually test accounts)
   OR email = 'lecose5513@fanwn.com'  -- Specific user to remove
ORDER BY created_at;

-- Step 2: Count how many users will be affected
SELECT COUNT(*) as users_to_remove
FROM user_profiles
WHERE email LIKE '%+%'
   OR email = 'lecose5513@fanwn.com';

-- Step 3: Delete related data first (due to foreign key constraints)
-- Delete from user_stats
DELETE FROM user_stats
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE email LIKE '%+%'
       OR email = 'lecose5513@fanwn.com'
);

-- Delete from game_sessions
DELETE FROM game_sessions
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE email LIKE '%+%'
       OR email = 'lecose5513@fanwn.com'
);

-- Delete from daily_completions
DELETE FROM daily_completions
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE email LIKE '%+%'
       OR email = 'lecose5513@fanwn.com'
);

-- Delete from share_events
DELETE FROM share_events
WHERE user_id IN (
    SELECT id FROM user_profiles
    WHERE email LIKE '%+%'
       OR email = 'lecose5513@fanwn.com'
);

-- Step 4: Finally, delete the users from user_profiles
DELETE FROM user_profiles
WHERE email LIKE '%+%'
   OR email = 'lecose5513@fanwn.com';

-- Step 5: Verify the deletion was successful
SELECT COUNT(*) as remaining_users
FROM user_profiles
WHERE email LIKE '%+%'
   OR email = 'lecose5513@fanwn.com';

-- This should return 0 if successful

-- Step 6: View remaining valid users
SELECT COUNT(*) as total_remaining_users
FROM user_profiles;

-- Optional: View the remaining users to confirm
SELECT email, first_name, created_at
FROM user_profiles
ORDER BY created_at DESC;
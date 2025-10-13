-- Enable guest tracking in PM Puzzle database
-- This script allows guest users to create and update their own records

-- 1. First, ensure RLS is enabled on the tables (if not already)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies that might conflict (safe to run even if they don't exist)
DROP POLICY IF EXISTS "Guest users can insert their own stats" ON user_stats;
DROP POLICY IF EXISTS "Guest users can update their own stats" ON user_stats;
DROP POLICY IF EXISTS "Guest users can read their own stats" ON user_stats;
DROP POLICY IF EXISTS "Anonymous users can insert stats" ON user_stats;
DROP POLICY IF EXISTS "Anonymous users can update stats" ON user_stats;
DROP POLICY IF EXISTS "Anonymous users can read stats" ON user_stats;

DROP POLICY IF EXISTS "Guest users can insert game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Guest users can read their own sessions" ON game_sessions;
DROP POLICY IF EXISTS "Anonymous users can insert sessions" ON game_sessions;

-- 3. Create policies for user_stats table
-- Allow anyone (including anonymous/guests) to insert stats for guest IDs
CREATE POLICY "Anonymous users can insert stats"
ON user_stats
FOR INSERT
TO anon, authenticated
WITH CHECK (
    -- Allow if user_id starts with 'guest_'
    user_id LIKE 'guest_%'
    OR
    -- Or if authenticated user inserting their own record
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
);

-- Allow anyone to update guest stats or their own stats
CREATE POLICY "Anonymous users can update stats"
ON user_stats
FOR UPDATE
TO anon, authenticated
USING (
    -- Can update if it's a guest record
    user_id LIKE 'guest_%'
    OR
    -- Or if authenticated user updating their own record
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
)
WITH CHECK (
    -- Same conditions for the new row
    user_id LIKE 'guest_%'
    OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
);

-- Allow anyone to read guest stats or their own stats
CREATE POLICY "Anonymous users can read stats"
ON user_stats
FOR SELECT
TO anon, authenticated
USING (
    -- Can read if it's a guest record
    user_id LIKE 'guest_%'
    OR
    -- Or if authenticated user reading their own record
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
    OR
    -- Or if part of admin RPC function context (for dashboard)
    current_setting('request.jwt.claims', true)::json->>'email' = 'admin@pmpuzzle.com'
);

-- 4. Create policies for game_sessions table
-- Allow anyone to insert game sessions for guest IDs
CREATE POLICY "Anonymous users can insert sessions"
ON game_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (
    -- Allow if user_id starts with 'guest_' or is null
    user_id IS NULL
    OR user_id LIKE 'guest_%'
    OR
    -- Or if authenticated user inserting their own session
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
);

-- Allow reading own sessions
CREATE POLICY "Users can read own sessions"
ON game_sessions
FOR SELECT
TO anon, authenticated
USING (
    -- Can read if it's a guest record
    user_id IS NULL
    OR user_id LIKE 'guest_%'
    OR
    -- Or if authenticated user reading their own sessions
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
);

-- Allow updating own sessions
CREATE POLICY "Users can update own sessions"
ON game_sessions
FOR UPDATE
TO anon, authenticated
USING (
    -- Can update if it's a guest record
    user_id IS NULL
    OR user_id LIKE 'guest_%'
    OR
    -- Or if authenticated user updating their own session
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
)
WITH CHECK (
    -- Same conditions for the new row
    user_id IS NULL
    OR user_id LIKE 'guest_%'
    OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
);

-- 5. Grant necessary permissions to anonymous role
GRANT SELECT, INSERT, UPDATE ON user_stats TO anon;
GRANT SELECT, INSERT, UPDATE ON game_sessions TO anon;

-- 6. Ensure the anon role can use necessary functions
GRANT EXECUTE ON FUNCTION auth.uid() TO anon;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon;

-- Verify the policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('user_stats', 'game_sessions')
ORDER BY tablename, policyname;
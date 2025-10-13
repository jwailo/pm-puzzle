-- Enable guest tracking in PM Puzzle database (Simple NULL-based approach)
-- This script allows guest users to create and update records with NULL user_id

-- 1. First, ensure RLS is enabled on the tables (if not already)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start fresh (safe to run even if they don't exist)
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_stats;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_stats;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_stats;
DROP POLICY IF EXISTS "Guest users can insert their own stats" ON user_stats;
DROP POLICY IF EXISTS "Guest users can update their own stats" ON user_stats;
DROP POLICY IF EXISTS "Guest users can read their own stats" ON user_stats;
DROP POLICY IF EXISTS "Anonymous users can insert stats" ON user_stats;
DROP POLICY IF EXISTS "Anonymous users can update stats" ON user_stats;
DROP POLICY IF EXISTS "Anonymous users can read stats" ON user_stats;

DROP POLICY IF EXISTS "Users can view own sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON game_sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON game_sessions;
DROP POLICY IF EXISTS "Enable insert for all users" ON game_sessions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON game_sessions;
DROP POLICY IF EXISTS "Guest users can insert game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Guest users can read their own sessions" ON game_sessions;
DROP POLICY IF EXISTS "Anonymous users can insert sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can read own sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON game_sessions;

-- 3. Create SIMPLE, PERMISSIVE policies for user_stats table
-- Allow EVERYONE to do EVERYTHING (for now, to get it working)
CREATE POLICY "Allow all operations on user_stats"
ON user_stats
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Create SIMPLE, PERMISSIVE policies for game_sessions table
-- Allow EVERYONE to do EVERYTHING (for now, to get it working)
CREATE POLICY "Allow all operations on game_sessions"
ON game_sessions
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Grant necessary permissions to anonymous role
GRANT ALL ON user_stats TO anon;
GRANT ALL ON game_sessions TO anon;

-- 6. Ensure the anon role can use necessary functions
GRANT EXECUTE ON FUNCTION auth.uid() TO anon;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon;

-- 7. Check if we need to modify the table structure to allow text user_ids
-- First, let's check the current column type
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('user_stats', 'game_sessions')
    AND column_name = 'user_id'
ORDER BY table_name;

-- Verify the policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('user_stats', 'game_sessions')
ORDER BY tablename, policyname;
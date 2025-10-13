-- Fix guest tracking in PM Puzzle database
-- This enables anonymous users to save their game data

-- 1. Enable RLS on tables
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to avoid conflicts
DO $$
BEGIN
    -- Drop all policies on user_stats
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
    DROP POLICY IF EXISTS "Allow all operations on user_stats" ON user_stats;

    -- Drop all policies on game_sessions
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
    DROP POLICY IF EXISTS "Allow all operations on game_sessions" ON game_sessions;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore errors if policies don't exist
END $$;

-- 3. Add a session_id column to track guest sessions (if not exists)
DO $$
BEGIN
    -- Add session_id column to user_stats if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_stats' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE user_stats ADD COLUMN session_id TEXT;
        CREATE INDEX idx_user_stats_session_id ON user_stats(session_id);
    END IF;

    -- Add session_id column to game_sessions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'game_sessions' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE game_sessions ADD COLUMN session_id TEXT;
        CREATE INDEX idx_game_sessions_session_id ON game_sessions(session_id);
    END IF;
END $$;

-- 4. Create new permissive policies for user_stats
CREATE POLICY "Public read access"
ON user_stats FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public insert access"
ON user_stats FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public update access"
ON user_stats FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Create new permissive policies for game_sessions
CREATE POLICY "Public read access"
ON game_sessions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public insert access"
ON game_sessions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public update access"
ON game_sessions FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. Grant permissions to anon role
GRANT ALL ON user_stats TO anon;
GRANT ALL ON game_sessions TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 7. Ensure functions are accessible
GRANT EXECUTE ON FUNCTION auth.uid() TO anon;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon;

-- 8. Verify the changes
SELECT 'Checking user_stats columns:' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_stats'
AND column_name IN ('user_id', 'session_id')
ORDER BY column_name;

SELECT 'Checking game_sessions columns:' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'game_sessions'
AND column_name IN ('user_id', 'session_id')
ORDER BY column_name;

SELECT 'Policies created:' as status;
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('user_stats', 'game_sessions')
ORDER BY tablename, policyname;
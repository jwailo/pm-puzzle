-- Fix column issues and permissions for guest tracking

-- 1. First check what columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY column_name;

-- 2. Add missing columns if they don't exist
DO $$
BEGIN
    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_stats' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE user_stats ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_stats' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_stats ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add the same for game_sessions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'game_sessions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE game_sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'game_sessions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE game_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Ensure RLS is enabled
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON user_stats;
DROP POLICY IF EXISTS "Public insert access" ON user_stats;
DROP POLICY IF EXISTS "Public update access" ON user_stats;
DROP POLICY IF EXISTS "Public read access" ON game_sessions;
DROP POLICY IF EXISTS "Public insert access" ON game_sessions;
DROP POLICY IF EXISTS "Public update access" ON game_sessions;

-- 5. Create simple permissive policies for testing
CREATE POLICY "Allow all for user_stats"
ON user_stats
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for game_sessions"
ON game_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- 6. Grant full permissions to anon
GRANT ALL ON user_stats TO anon;
GRANT ALL ON game_sessions TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 7. Verify the changes
SELECT 'Columns in user_stats:' as check_type;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY column_name;

SELECT 'Columns in game_sessions:' as check_type;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'game_sessions'
ORDER BY column_name;

SELECT 'Policies created:' as check_type;
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('user_stats', 'game_sessions');
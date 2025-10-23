-- CHECK AND FIX GAME_SESSIONS TABLE PERMISSIONS

-- 1. Check if the table exists
SELECT 'Table exists check:' as info;
SELECT COUNT(*) as game_sessions_exists
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'game_sessions';

-- 2. Check current row count
SELECT 'Current rows in game_sessions:' as info, COUNT(*) as count
FROM game_sessions;

-- 3. Check RLS (Row Level Security) status
SELECT 'RLS status:' as info;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'game_sessions';

-- 4. Check existing policies
SELECT 'Existing policies:' as info;
SELECT policy_name, command, roles, permissive, qual
FROM pg_policies
WHERE tablename = 'game_sessions';

-- 5. DISABLE RLS (if it's preventing inserts)
ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;

-- 6. Grant permissions to authenticated and anon users
GRANT ALL ON game_sessions TO authenticated;
GRANT ALL ON game_sessions TO anon;

-- 7. Create a simple insert policy if RLS is needed
-- First drop existing policies
DROP POLICY IF EXISTS "Enable insert for all users" ON game_sessions;
DROP POLICY IF EXISTS "Enable read for all users" ON game_sessions;
DROP POLICY IF EXISTS "Enable update for all users" ON game_sessions;

-- Create permissive policies
CREATE POLICY "Enable insert for all users" ON game_sessions
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON game_sessions
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Enable update for all users" ON game_sessions
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 8. Test insert (this will create a test record)
INSERT INTO game_sessions (
    session_id,
    user_id,
    game_over,
    game_won,
    current_row,
    date,
    created_at,
    updated_at
) VALUES (
    'test-' || gen_random_uuid()::text,
    NULL,
    true,
    true,
    3,
    CURRENT_DATE,
    NOW(),
    NOW()
);

-- 9. Verify the insert worked
SELECT 'After test insert:' as info;
SELECT COUNT(*) as count_after_insert FROM game_sessions;

-- 10. Check if there are any errors in the table structure
SELECT 'Table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'game_sessions'
ORDER BY ordinal_position;
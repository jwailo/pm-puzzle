-- Check current database status for guest tracking

-- 1. Check if session_id columns exist
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('user_stats', 'game_sessions')
    AND column_name IN ('user_id', 'session_id')
ORDER BY table_name, column_name;

-- 2. Check current RLS policies
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('user_stats', 'game_sessions')
ORDER BY tablename, policyname;

-- 3. Check if anon role has permissions
SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('user_stats', 'game_sessions')
    AND grantee = 'anon'
ORDER BY table_name, privilege_type;
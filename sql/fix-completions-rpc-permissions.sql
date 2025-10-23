-- FIX RPC PERMISSIONS ISSUE FOR COMPLETIONS
-- The function returns data in SQL Editor but empty array in JavaScript
-- This indicates a permissions/RPC issue

-- Step 1: Drop existing function to start fresh
DROP FUNCTION IF EXISTS get_daily_puzzle_completions();

-- Step 2: Create function with proper security and permissions
CREATE OR REPLACE FUNCTION public.get_daily_puzzle_completions()
RETURNS TABLE (
    completion_date DATE,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    guesses INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COALESCE(gs.date, gs.created_at::DATE) as completion_date,
        gs.user_id,
        COALESCE(up.email, 'Unknown Email') as email,
        COALESCE(up.first_name, 'Unknown User') as first_name,
        COALESCE(gs.updated_at, gs.created_at) as completed_at,
        COALESCE(gs.current_row + 1, 6) as guesses
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL
    ORDER BY COALESCE(gs.date, gs.created_at::DATE) DESC,
             COALESCE(gs.updated_at, gs.created_at) ASC;
$$;

-- Step 3: Grant explicit permissions to all necessary roles
GRANT EXECUTE ON FUNCTION public.get_daily_puzzle_completions() TO anon;
GRANT EXECUTE ON FUNCTION public.get_daily_puzzle_completions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_puzzle_completions() TO service_role;

-- Step 4: Ensure the function is in the correct schema
ALTER FUNCTION public.get_daily_puzzle_completions() OWNER TO postgres;

-- Step 5: Test the function
SELECT '=== Testing Function Output ===' as info;
SELECT COUNT(*) as total_completions FROM public.get_daily_puzzle_completions();

-- Step 6: Create an alternative view-based approach if RPC still fails
CREATE OR REPLACE VIEW public.puzzle_completions_view AS
SELECT
    COALESCE(gs.date, gs.created_at::DATE) as completion_date,
    gs.user_id,
    COALESCE(up.email, 'Unknown Email') as email,
    COALESCE(up.first_name, 'Unknown User') as first_name,
    COALESCE(gs.updated_at, gs.created_at) as completed_at,
    COALESCE(gs.current_row + 1, 6) as guesses
FROM game_sessions gs
LEFT JOIN user_profiles up ON gs.user_id = up.id
WHERE gs.game_won = true
    AND gs.user_id IS NOT NULL
ORDER BY COALESCE(gs.date, gs.created_at::DATE) DESC,
         COALESCE(gs.updated_at, gs.created_at) ASC;

-- Grant permissions for the view
GRANT SELECT ON public.puzzle_completions_view TO anon;
GRANT SELECT ON public.puzzle_completions_view TO authenticated;
GRANT SELECT ON public.puzzle_completions_view TO service_role;

-- Step 7: Create a simpler function with minimal complexity
CREATE OR REPLACE FUNCTION public.get_completions_simple()
RETURNS SETOF json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT json_build_object(
        'completion_date', COALESCE(gs.date, gs.created_at::DATE),
        'user_id', gs.user_id,
        'email', COALESCE(up.email, 'Unknown Email'),
        'first_name', COALESCE(up.first_name, 'Unknown User'),
        'completed_at', COALESCE(gs.updated_at, gs.created_at),
        'guesses', COALESCE(gs.current_row + 1, 6)
    )
    FROM game_sessions gs
    LEFT JOIN user_profiles up ON gs.user_id = up.id
    WHERE gs.game_won = true
        AND gs.user_id IS NOT NULL
    ORDER BY COALESCE(gs.date, gs.created_at::DATE) DESC;
$$;

-- Grant permissions for the simple function
GRANT EXECUTE ON FUNCTION public.get_completions_simple() TO anon;
GRANT EXECUTE ON FUNCTION public.get_completions_simple() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_completions_simple() TO service_role;

-- Step 8: Verify all functions are accessible
SELECT '=== Function Permissions Check ===' as info;
SELECT
    routine_schema,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_name IN ('get_daily_puzzle_completions', 'get_completions_simple')
    AND routine_schema = 'public';

-- Step 9: Check if RLS policies might be interfering
SELECT '=== RLS Policy Check ===' as info;
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
WHERE tablename IN ('game_sessions', 'user_profiles')
ORDER BY tablename, policyname;

-- Step 10: Test all approaches
SELECT '=== Test Main Function ===' as info;
SELECT COUNT(*) FROM public.get_daily_puzzle_completions();

SELECT '=== Test View ===' as info;
SELECT COUNT(*) FROM public.puzzle_completions_view;

SELECT '=== Test Simple Function ===' as info;
SELECT COUNT(*) FROM public.get_completions_simple();
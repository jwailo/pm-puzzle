-- Fix for admin user list function
-- Run this in Supabase SQL Editor to fix the type mismatch error

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_admin_user_list();

-- Create a simpler version that matches the actual table types
CREATE OR REPLACE FUNCTION get_admin_user_list()
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ,
    games_played INT,
    games_won INT,
    max_streak INT,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        up.id,
        up.first_name,
        up.email,
        up.created_at,
        COALESCE(us.games_played, 0),
        COALESCE(us.games_won, 0),
        COALESCE(us.max_streak, 0),
        COALESCE(us.updated_at, up.created_at)
    FROM user_profiles up
    LEFT JOIN user_stats us ON up.id = us.user_id
    ORDER BY up.created_at DESC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_user_list() TO anon, authenticated;

-- Test the function
SELECT * FROM get_admin_user_list();
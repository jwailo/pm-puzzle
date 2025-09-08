-- Fix total players calculation to include all signed up users + guests
-- Run this in Supabase SQL Editor

-- Create a function to get the correct total player count
CREATE OR REPLACE FUNCTION get_admin_total_players()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    signed_up_count INTEGER;
    guest_count INTEGER;
    total INTEGER;
BEGIN
    -- Count all signed up users
    SELECT COUNT(*) INTO signed_up_count FROM user_profiles;
    
    -- Count guest players (user_id starting with 'guest_')
    SELECT COUNT(*) INTO guest_count 
    FROM user_stats 
    WHERE user_id LIKE 'guest_%';
    
    -- Total = signed up + guests
    total := signed_up_count + guest_count;
    
    RETURN total;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_total_players() TO anon, authenticated;

-- Test the function
SELECT get_admin_total_players() as total_players,
       (SELECT COUNT(*) FROM user_profiles) as signed_up_users,
       (SELECT COUNT(*) FROM user_stats WHERE user_id LIKE 'guest_%') as guest_players;
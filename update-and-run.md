# Update Instructions for Showing ALL Completions

## Step 1: Update the Database Function

Run this SQL in your Supabase SQL editor to remove the LIMIT 10 restriction:

```sql
-- UPDATE get_public_daily_leaderboard TO SHOW ALL COMPLETIONS (not just top 10)

-- Drop the old function
DROP FUNCTION IF EXISTS get_public_daily_leaderboard(DATE);

-- Recreate without LIMIT 10
CREATE OR REPLACE FUNCTION get_public_daily_leaderboard(target_date DATE)
RETURNS TABLE (
    user_id UUID,
    completion_time INTEGER,
    guesses INTEGER,
    user_profiles JSON,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pc.user_id,
        pc.time_seconds as completion_time,
        pc.guesses,
        row_to_json(up.*) as user_profiles,
        pc.created_at
    FROM puzzle_completions pc
    LEFT JOIN user_profiles up ON pc.user_id = up.id
    WHERE pc.puzzle_date = target_date
        AND pc.user_id IS NOT NULL -- Only signed-in users
    ORDER BY pc.time_seconds ASC, pc.created_at ASC; -- Fastest times first, then by completion order
    -- REMOVED: LIMIT 10
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_public_daily_leaderboard(DATE) TO anon, authenticated;
```

## Step 2: Add Scrollable Styles

The CSS changes have been added to make the leaderboard scrollable when there are many completions.

## Step 3: Test

1. Run the SQL above in Supabase
2. Refresh your game page
3. Check that all completions now show in both the game and admin panel
4. The leaderboard will be scrollable if there are more than 10 entries
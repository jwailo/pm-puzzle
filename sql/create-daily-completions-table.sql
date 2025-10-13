-- Create a table to track each daily puzzle completion
-- This will allow users to appear multiple times (once for each day they complete)

-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS daily_completions;

-- Create the daily_completions table
CREATE TABLE daily_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    puzzle_date DATE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    puzzle_word TEXT,
    guesses INTEGER,
    time_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_daily_completions_user_id ON daily_completions(user_id);
CREATE INDEX idx_daily_completions_puzzle_date ON daily_completions(puzzle_date);
CREATE INDEX idx_daily_completions_completed_at ON daily_completions(completed_at);

-- Create a unique constraint to prevent duplicate entries for same user/date
CREATE UNIQUE INDEX idx_unique_user_puzzle_date ON daily_completions(user_id, puzzle_date);

-- Enable RLS
ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to insert their own completions
CREATE POLICY "Users can insert own completions" ON daily_completions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view all completions
CREATE POLICY "Users can view all completions" ON daily_completions
    FOR SELECT TO authenticated
    USING (true);

-- Allow anon users to view all completions (for admin dashboard)
CREATE POLICY "Anon can view completions" ON daily_completions
    FOR SELECT TO anon
    USING (true);

-- Grant permissions
GRANT SELECT ON daily_completions TO anon;
GRANT SELECT, INSERT ON daily_completions TO authenticated;

-- Function to record a puzzle completion
CREATE OR REPLACE FUNCTION record_puzzle_completion(
    p_puzzle_date DATE,
    p_puzzle_word TEXT,
    p_guesses INTEGER,
    p_time_seconds INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only record if user is authenticated
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO daily_completions (
            user_id,
            puzzle_date,
            puzzle_word,
            guesses,
            time_seconds
        ) VALUES (
            auth.uid(),
            p_puzzle_date,
            p_puzzle_word,
            p_guesses,
            p_time_seconds
        )
        ON CONFLICT (user_id, puzzle_date)
        DO UPDATE SET
            completed_at = NOW(),
            guesses = EXCLUDED.guesses,
            time_seconds = EXCLUDED.time_seconds;
    END IF;
END;
$$;

-- Grant permission to execute the function
GRANT EXECUTE ON FUNCTION record_puzzle_completion(DATE, TEXT, INTEGER, INTEGER) TO authenticated;

-- Migrate existing data from user_stats (one-time migration)
-- This creates entries for today for users who have won games
INSERT INTO daily_completions (user_id, puzzle_date, completed_at, guesses)
SELECT
    us.user_id,
    CURRENT_DATE as puzzle_date,
    us.updated_at as completed_at,
    6 as guesses  -- Default guess count since we don't have the actual data
FROM user_stats us
WHERE us.user_id IS NOT NULL
    AND us.games_won > 0
    AND NOT EXISTS (
        SELECT 1 FROM daily_completions dc
        WHERE dc.user_id = us.user_id
        AND dc.puzzle_date = CURRENT_DATE
    );

-- Now create the function to get all daily completions
CREATE OR REPLACE FUNCTION get_daily_puzzle_completions()
RETURNS TABLE (
    completion_date DATE,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    guesses INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.puzzle_date as completion_date,
        dc.user_id,
        COALESCE(up.email, 'Unknown') as email,
        COALESCE(up.first_name, 'Unknown') as first_name,
        dc.guesses
    FROM daily_completions dc
    LEFT JOIN user_profiles up ON dc.user_id = up.id
    ORDER BY dc.puzzle_date DESC, dc.completed_at ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_puzzle_completions() TO anon;

-- Test the function
SELECT * FROM get_daily_puzzle_completions();
-- Create separate tables for Ailo Support Puzzle
-- This ensures complete data separation from the main PM Puzzle

-- 1. Create Ailo-specific user stats table
CREATE TABLE IF NOT EXISTS ailo_user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    guess_distribution INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0],
    last_played DATE,
    last_completed DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Ailo-specific daily completions table
CREATE TABLE IF NOT EXISTS ailo_daily_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    puzzle_date DATE NOT NULL,
    puzzle_word TEXT,
    guesses INTEGER,
    time_seconds INTEGER,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, puzzle_date)
);

-- 3. Create Ailo-specific game sessions table
CREATE TABLE IF NOT EXISTS ailo_game_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    puzzle_date DATE,
    word TEXT,
    guesses INTEGER,
    game_over BOOLEAN DEFAULT FALSE,
    game_won BOOLEAN DEFAULT FALSE,
    current_row INTEGER,
    completion_time INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create function to record Ailo puzzle completion
CREATE OR REPLACE FUNCTION record_ailo_puzzle_completion(
    p_puzzle_date DATE,
    p_puzzle_word TEXT,
    p_guesses INTEGER,
    p_time_seconds INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only record if user is authenticated
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO ailo_daily_completions (
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

-- 5. Create function to get Ailo daily leaderboard
CREATE OR REPLACE FUNCTION get_ailo_daily_leaderboard(target_date DATE)
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
        dc.user_id,
        dc.time_seconds as completion_time,
        dc.guesses,
        row_to_json(up.*) as user_profiles,
        COALESCE(dc.completed_at, dc.created_at) as created_at
    FROM ailo_daily_completions dc
    LEFT JOIN user_profiles up ON dc.user_id = up.id
    WHERE dc.puzzle_date = target_date
        AND dc.user_id IS NOT NULL
    ORDER BY dc.time_seconds ASC, COALESCE(dc.completed_at, dc.created_at) ASC;
    -- No LIMIT - show all completions
END;
$$;

-- 6. Grant permissions
GRANT ALL ON ailo_user_stats TO authenticated;
GRANT ALL ON ailo_daily_completions TO authenticated;
GRANT ALL ON ailo_game_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION record_ailo_puzzle_completion TO authenticated;
GRANT EXECUTE ON FUNCTION get_ailo_daily_leaderboard TO authenticated;

-- 7. Create RLS policies
ALTER TABLE ailo_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ailo_daily_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ailo_game_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read all stats (for leaderboards)
CREATE POLICY "Read all ailo stats" ON ailo_user_stats
    FOR SELECT USING (true);

-- Users can update their own stats
CREATE POLICY "Update own ailo stats" ON ailo_user_stats
    FOR ALL USING (auth.uid() = user_id);

-- Users can read all completions (for leaderboards)
CREATE POLICY "Read all ailo completions" ON ailo_daily_completions
    FOR SELECT USING (true);

-- Users can insert their own completions
CREATE POLICY "Insert own ailo completions" ON ailo_daily_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can manage their own sessions
CREATE POLICY "Manage own ailo sessions" ON ailo_game_sessions
    FOR ALL USING (auth.uid() = user_id);

COMMENT ON TABLE ailo_user_stats IS 'Separate stats tracking for Ailo Support Puzzle';
COMMENT ON TABLE ailo_daily_completions IS 'Separate daily completion tracking for Ailo Support Puzzle';
COMMENT ON TABLE ailo_game_sessions IS 'Separate game session tracking for Ailo Support Puzzle';
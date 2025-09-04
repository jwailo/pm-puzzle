-- Create share_analytics table for tracking user sharing behavior
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS share_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    audience_type VARCHAR(50) NOT NULL,
    custom_audience VARCHAR(100),
    shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    game_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_share_analytics_user_id ON share_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_audience_type ON share_analytics(audience_type);
CREATE INDEX IF NOT EXISTS idx_share_analytics_shared_at ON share_analytics(shared_at);
CREATE INDEX IF NOT EXISTS idx_share_analytics_game_date ON share_analytics(game_date);

-- Enable Row Level Security
ALTER TABLE share_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can insert their own share records
CREATE POLICY "Users can insert their own shares" ON share_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own share records  
CREATE POLICY "Users can view their own shares" ON share_analytics
    FOR SELECT USING (auth.uid() = user_id);

-- Admin functions to get share analytics (bypasses RLS)
CREATE OR REPLACE FUNCTION get_admin_share_stats()
RETURNS TABLE (
    audience_type VARCHAR(50),
    share_count BIGINT,
    recent_shares BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.audience_type,
        COUNT(*) as share_count,
        COUNT(CASE WHEN sa.shared_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_shares
    FROM share_analytics sa
    GROUP BY sa.audience_type
    ORDER BY share_count DESC;
END;
$$;

-- Function to get total shares count
CREATE OR REPLACE FUNCTION get_admin_total_shares()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total INTEGER;
BEGIN
    SELECT COUNT(*) INTO total FROM share_analytics;
    RETURN total;
END;
$$;

-- Function to get recent custom audience entries
CREATE OR REPLACE FUNCTION get_admin_recent_custom_shares()
RETURNS TABLE (
    custom_audience VARCHAR(100),
    shared_at TIMESTAMPTZ,
    share_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.custom_audience,
        sa.shared_at,
        COUNT(*) OVER (PARTITION BY sa.custom_audience) as share_count
    FROM share_analytics sa
    WHERE sa.audience_type = 'custom' 
    AND sa.custom_audience IS NOT NULL
    AND sa.custom_audience != ''
    ORDER BY sa.shared_at DESC
    LIMIT 50;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_share_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_total_shares() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_recent_custom_shares() TO anon, authenticated;
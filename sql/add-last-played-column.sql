-- Add last_played column to user_stats table
-- This column is required for streak calculation to work properly

-- Add the column if it doesn't exist
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS last_played DATE;

-- Set initial values for existing records based on their last update
UPDATE user_stats
SET last_played = DATE(updated_at)
WHERE last_played IS NULL
  AND updated_at IS NOT NULL;

-- For any remaining nulls, set to today
UPDATE user_stats
SET last_played = CURRENT_DATE
WHERE last_played IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN user_stats.last_played IS 'The date (in YYYY-MM-DD format) when the user last played a game. Used for streak calculation.';

-- Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_stats'
  AND column_name = 'last_played';
-- Migration: Add security columns to users table
-- Date: May 28, 2026

-- Add refresh_token column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(500);

-- Add last_login column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Create index on refresh_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_refresh_token ON users(refresh_token);

-- Create index on email for faster lookups during login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on utility_points map_id for faster queries
CREATE INDEX IF NOT EXISTS idx_utility_points_map_id ON utility_points(map_id);
-- Add team column to utility_points if it does not exist
ALTER TABLE utility_points ADD COLUMN IF NOT EXISTS team VARCHAR(10) DEFAULT 't';
-- Create index on suggestions user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);

-- Create index on clips user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_clips_user_id ON clips(user_id);

-- Add updated_at trigger for automatic timestamps (optional but recommended)
-- This ensures updated_at is automatically set when a record is modified
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table if it doesn't exist
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Create trigger for utility_points if it doesn't exist
DROP TRIGGER IF EXISTS update_utility_points_timestamp ON utility_points;
CREATE TRIGGER update_utility_points_timestamp
BEFORE UPDATE ON utility_points
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Create trigger for suggestions if it doesn't exist
DROP TRIGGER IF EXISTS update_suggestions_timestamp ON suggestions;
CREATE TRIGGER update_suggestions_timestamp
BEFORE UPDATE ON suggestions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Create trigger for clips if it doesn't exist
DROP TRIGGER IF EXISTS update_clips_timestamp ON clips;
CREATE TRIGGER update_clips_timestamp
BEFORE UPDATE ON clips
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

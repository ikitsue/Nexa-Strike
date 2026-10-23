-- Migration: Add ban functionality to users table
-- Date: 2026-06-11

-- Add banned column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;

-- Add ban_reason column for tracking why a user was banned
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(500);

-- Add banned_at column to track when the ban occurred
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;

-- Create index on banned for faster queries
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(banned);

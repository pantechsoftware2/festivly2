/**
 * MIGRATION: Add Daily Generation Limit Tracking
 * 
 * Purpose: Track daily image generations for free users (5 per day limit)
 * 
 * Prerequisites: 
 * - Supabase project running
 * - profiles table already exists
 * 
 * How to Apply:
 * 1. Go to Supabase Dashboard → Your Project → SQL Editor
 * 2. Create New Query
 * 3. Copy and paste this entire file
 * 4. Click "Run"
 * 
 * Rollback (if needed):
 * ALTER TABLE profiles DROP COLUMN IF EXISTS generations_today;
 * ALTER TABLE profiles DROP COLUMN IF EXISTS last_reset_date;
 */

-- Step 1: Add generation tracking columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS generations_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Create index for efficient queries on last_reset_date
CREATE INDEX IF NOT EXISTS idx_profiles_last_reset_date 
ON profiles(last_reset_date);

-- Step 3: Verify the columns were added
-- Run this to check: SELECT id, generations_today, last_reset_date FROM profiles LIMIT 5;

-- Optional: Reset all existing users to 0 generations
-- UPDATE profiles SET generations_today = 0, last_reset_date = NOW();

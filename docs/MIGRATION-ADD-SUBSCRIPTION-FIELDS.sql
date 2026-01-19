-- REQUIRED MIGRATION: Add subscription and image limit tracking to profiles table
-- This migration MUST be run in Supabase SQL Editor for Google auth signup to work properly
-- Without these columns, Google auth users cannot generate images

-- Add subscription_plan column with default 'free'
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free';

-- Add free_images_generated column to track free tier usage
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS free_images_generated INTEGER DEFAULT 0;

-- Create index for faster free_images_generated lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON profiles(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_profiles_free_images_generated ON profiles(free_images_generated);

-- Update existing NULL values to defaults
UPDATE profiles SET subscription_plan = 'free' WHERE subscription_plan IS NULL;
UPDATE profiles SET free_images_generated = 0 WHERE free_images_generated IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.subscription_plan IS 'User subscription tier: free, pro, pro_plus';
COMMENT ON COLUMN profiles.free_images_generated IS 'Number of free image generations used by the user';

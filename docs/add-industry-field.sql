-- Migration: Add industry_type field to profiles table
-- This migration adds support for storing user's business industry category

-- Add industry_type column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'general';

-- Add comment to describe the field
COMMENT ON COLUMN profiles.industry_type IS 'User business category: Education, Real Estate, Tech & Startup, Manufacturing, Retail & Fashion, Food & Cafe, or general';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_industry_type ON profiles(industry_type);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'industry_type';

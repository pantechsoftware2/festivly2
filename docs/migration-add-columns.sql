-- Migration: Add missing columns to projects table
-- This migration adds columns that were missing from the initial schema

-- Add columns to projects table if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS prompt TEXT,
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS canvas_state TEXT,
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS storage_paths TEXT[] DEFAULT '{}';

-- Create index on prompt for faster searches
CREATE INDEX IF NOT EXISTS idx_projects_prompt ON projects(prompt);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Update existing projects to have default values if needed
UPDATE projects SET image_urls = '{}' WHERE image_urls IS NULL;
UPDATE projects SET storage_paths = '{}' WHERE storage_paths IS NULL;
UPDATE projects SET tier = 1 WHERE tier IS NULL;

-- Fix Database Schema for Project Management
-- Run this in Supabase SQL Editor

-- Drop existing constraints that are wrong
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

-- Fix projects table to reference auth.users correctly
ALTER TABLE projects 
ADD CONSTRAINT projects_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure canvas_json can store large JSON
ALTER TABLE projects ALTER COLUMN canvas_json SET DEFAULT '{}'::jsonb;

-- Verify the structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

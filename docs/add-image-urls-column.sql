-- Add ALL missing columns to projects table

-- Add prompt column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS prompt TEXT;

-- Add image_urls column (array of URLs)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Add storage_paths column (array of paths)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS storage_paths TEXT[] DEFAULT '{}';

-- Add thumbnail_url column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Verify all columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;

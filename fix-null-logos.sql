-- Fix corrupted NULL values in brand_logo_url column
-- Converts string 'NULL' to actual NULL values

UPDATE profiles 
SET brand_logo_url = NULL 
WHERE brand_logo_url = 'NULL' OR brand_logo_url IS NOT NULL AND LENGTH(brand_logo_url) = 0;

-- Verify the fix
SELECT id, email, brand_logo_url, LENGTH(brand_logo_url) as url_length
FROM profiles
WHERE brand_logo_url IS NULL OR brand_logo_url = '';

-- Summary
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN brand_logo_url IS NULL THEN 1 END) as profiles_with_null_logo,
  COUNT(CASE WHEN brand_logo_url IS NOT NULL AND brand_logo_url != '' THEN 1 END) as profiles_with_url
FROM profiles;

/**
 * PRODUCTION-READY: Complete Daily Generation Limit Setup
 * 
 * Copy everything below and paste into Supabase SQL Editor
 * Then click "Run"
 * 
 * What this does:
 * 1. Adds two columns to profiles table
 * 2. Creates an index for performance
 * 3. Creates an atomic increment function (optional but recommended)
 * 4. Shows sample queries for verification
 */

-- ============================================================
-- PART 1: ADD COLUMNS TO PROFILES TABLE
-- ============================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS generations_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================
-- PART 2: CREATE INDEX FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_last_reset_date 
ON profiles(last_reset_date);

-- ============================================================
-- PART 3: CREATE ATOMIC INCREMENT FUNCTION (RECOMMENDED)
-- ============================================================

CREATE OR REPLACE FUNCTION increment_daily_generations(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET generations_today = COALESCE(generations_today, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 4: VERIFICATION QUERIES (RUN AFTER TO VERIFY)
-- ============================================================

-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('generations_today', 'last_reset_date');

-- Check if function was created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'increment_daily_generations';

-- Check if index was created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'profiles' 
AND indexname = 'idx_profiles_last_reset_date';

-- View sample user data (first 5 free users)
SELECT 
  id,
  email,
  subscription_plan,
  generations_today,
  last_reset_date,
  (CURRENT_DATE::timestamp - last_reset_date::timestamp)::interval as time_since_reset
FROM profiles
WHERE subscription_plan = 'free'
LIMIT 5;

-- ============================================================
-- PART 5: MONITORING QUERIES
-- ============================================================

-- Find free users close to daily limit
SELECT 
  id,
  email,
  generations_today,
  (5 - generations_today) as remaining_generations,
  last_reset_date
FROM profiles
WHERE subscription_plan = 'free' 
AND generations_today >= 3
ORDER BY generations_today DESC;

-- Find users who hit the limit today
SELECT 
  id,
  email,
  generations_today,
  last_reset_date
FROM profiles
WHERE subscription_plan = 'free'
AND generations_today >= 5
AND last_reset_date::date = CURRENT_DATE;

-- Summary statistics
SELECT 
  subscription_plan,
  COUNT(*) as total_users,
  AVG(generations_today)::numeric(5,2) as avg_generations,
  MAX(generations_today) as max_generations,
  SUM(CASE WHEN generations_today >= 5 THEN 1 ELSE 0 END) as users_at_limit
FROM profiles
GROUP BY subscription_plan;

-- ============================================================
-- PART 6: MAINTENANCE (RUN OCCASIONALLY)
-- ============================================================

-- Reset all users' counters and dates (for testing/reset)
-- WARNING: Only run if you know what you're doing!
-- UPDATE profiles 
-- SET generations_today = 0, last_reset_date = NOW()
-- WHERE subscription_plan = 'free';

-- ============================================================
-- PART 7: COLUMN DESCRIPTIONS (FOR DOCUMENTATION)
-- ============================================================

-- generations_today: INTEGER
-- Purpose: Tracks how many images user has generated today (resets at midnight UTC)
-- Default: 0
-- Constraint: Must be >= 0
-- Used in: generateImage API (STEP B limit check, STEP C increment)

-- last_reset_date: TIMESTAMP WITH TIME ZONE
-- Purpose: Records the date when generations_today was last reset
-- Default: Current timestamp
-- Timezone: UTC (TIME ZONE)
-- Used in: generateImage API (STEP A date comparison)

-- ============================================================
-- SUCCESS INDICATORS
-- ============================================================

-- After running this script, you should see:
-- ✅ 2 new columns in profiles table
-- ✅ 1 new index on last_reset_date
-- ✅ 1 new function 'increment_daily_generations'
-- ✅ No errors in the SQL editor

-- If you see any errors, check:
-- 1. profiles table exists
-- 2. You have admin/owner permissions in Supabase
-- 3. No syntax errors in the SQL

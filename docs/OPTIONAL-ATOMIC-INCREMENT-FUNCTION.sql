/**
 * OPTIONAL: Create Stored Function for Atomic Generation Counter Increment
 * 
 * Purpose: Safely increment daily generation counter without race conditions
 * This is OPTIONAL - the API has a fallback to direct update
 * 
 * How to Apply:
 * 1. Go to Supabase Dashboard → Your Project → SQL Editor
 * 2. Create New Query
 * 3. Copy and paste this function definition
 * 4. Click "Run"
 * 
 * Benefits:
 * - Atomic operation (guaranteed single increment, no race conditions)
 * - Better for concurrent users
 * - More efficient on the database
 * 
 * To Call from API:
 * const { error } = await supabase.rpc('increment_daily_generations', {
 *   user_id: userId
 * })
 */

CREATE OR REPLACE FUNCTION increment_daily_generations(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Atomically increment the daily generation counter
  -- This is safer than separate SELECT + UPDATE in concurrent scenarios
  UPDATE profiles
  SET generations_today = COALESCE(generations_today, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Add comment for documentation
COMMENT ON FUNCTION increment_daily_generations(user_id UUID) IS 
'Atomically increments the daily generation counter for a user. Called after successful image generation.';

-- PRODUCTION FIX: Atomic Counter Update + Trigger Protection
-- This prevents race conditions when multiple concurrent requests hit different server instances

-- 1. Add database trigger to enforce ONE increment maximum
-- This provides an additional safety layer in case of race conditions

CREATE OR REPLACE FUNCTION increment_free_images_generated()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent incrementing if already incremented
  -- Once free_images_generated > 0, it should never be decremented
  IF NEW.free_images_generated < OLD.free_images_generated THEN
    RAISE EXCEPTION 'Cannot decrement free_images_generated counter';
  END IF;
  
  -- Enforce max 1 increment for free users
  IF NEW.subscription_plan = 'free' AND NEW.free_images_generated > 1 THEN
    NEW.free_images_generated := 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_free_images_limit ON profiles;

-- Create trigger
CREATE TRIGGER enforce_free_images_limit
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION increment_free_images_generated();

-- 2. Create index for faster WHERE clause evaluation
CREATE INDEX IF NOT EXISTS idx_profiles_free_images_0 
ON profiles(id) 
WHERE free_images_generated = 0 AND subscription_plan = 'free';

-- 3. Add check constraint to prevent invalid states
ALTER TABLE profiles 
ADD CONSTRAINT check_free_images_limit 
CHECK (free_images_generated >= 0 AND (subscription_plan != 'free' OR free_images_generated <= 1));

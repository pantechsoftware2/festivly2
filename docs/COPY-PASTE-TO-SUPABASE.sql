-- ============================================================
-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- ============================================================

-- Add columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS generations_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index
CREATE INDEX IF NOT EXISTS idx_profiles_last_reset_date 
ON profiles(last_reset_date);

-- Add function
CREATE OR REPLACE FUNCTION increment_daily_generations(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET generations_today = COALESCE(generations_today, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

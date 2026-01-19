-- Migration: Add upsert_profile_logo function for reliable profile creation/update
-- This function ensures the profile is created or updated with logo URL atomically

CREATE OR REPLACE FUNCTION public.upsert_profile_logo(
  p_user_id UUID,
  p_email TEXT,
  p_industry_type TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  industry_type TEXT,
  brand_logo_url TEXT
) AS $$
BEGIN
  INSERT INTO public.profiles (id, email, industry_type, brand_logo_url)
  VALUES (p_user_id, p_email, p_industry_type, p_logo_url)
  ON CONFLICT (id)
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    industry_type = COALESCE(EXCLUDED.industry_type, profiles.industry_type),
    brand_logo_url = COALESCE(EXCLUDED.brand_logo_url, profiles.brand_logo_url),
    updated_at = CURRENT_TIMESTAMP
  RETURNING profiles.id, profiles.email, profiles.industry_type, profiles.brand_logo_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.upsert_profile_logo(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_profile_logo(UUID, TEXT, TEXT, TEXT) TO service_role;

-- Make the function callable from API (via Supabase)
-- In Supabase, this can be called like:
-- SELECT * FROM public.upsert_profile_logo(user_id, email, industry_type, logo_url)

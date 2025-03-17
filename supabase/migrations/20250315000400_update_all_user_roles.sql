-- Migration: Update All User Roles
-- Description: Updates all existing users' JWT metadata with their roles
-- Version: 20250315000400

-- Function to update existing users' raw app metadata with their roles
CREATE OR REPLACE FUNCTION public.update_all_user_roles_in_metadata()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users and update their metadata
  FOR user_record IN SELECT auth.users.id, profiles.role FROM auth.users JOIN profiles ON auth.users.id = profiles.id
  LOOP
    -- Update the user's raw_app_meta_data with their role
    UPDATE auth.users 
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', user_record.role)
    WHERE id = user_record.id;
    
    -- Update the user's raw_user_meta_data with their role if it doesn't exist
    UPDATE auth.users 
    SET raw_user_meta_data = 
      CASE
        WHEN raw_user_meta_data->>'role' IS NULL THEN 
          raw_user_meta_data || jsonb_build_object('role', user_record.role)
        ELSE
          raw_user_meta_data
      END
    WHERE id = user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to update all users
SELECT public.update_all_user_roles_in_metadata();

-- IMPORTANT NOTES:
-- 1. This migration should be run whenever you update the JWT hook functions
-- 2. After running this migration, users will need to log out and log back in
--    to get a new JWT with the updated claims
-- 3. You should verify that the custom_access_token_hook is enabled in the
--    Supabase Dashboard (Authentication > Hooks)

-- For testing purposes, you can verify the JWT claims using the following SQL:
-- SELECT id, raw_app_meta_data, raw_user_meta_data FROM auth.users; 
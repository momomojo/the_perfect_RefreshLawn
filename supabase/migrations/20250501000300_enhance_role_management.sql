-- Migration: Enhance Role Management
-- Description: Create triggers and functions to handle user_metadata role assignments
-- Version: 20250501000300

-- 1. Create or replace a trigger function to capture role from raw_user_meta_data during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if role exists in raw_user_meta_data, otherwise default to 'customer'
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Make sure the trigger exists on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create a function to update a user's role in both profiles table and user metadata
CREATE OR REPLACE FUNCTION public.update_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN := FALSE;
BEGIN
  -- Update the role in the profiles table
  UPDATE public.profiles
  SET role = new_role
  WHERE id = user_id;
  
  -- Return true if a row was updated
  IF FOUND THEN
    result := TRUE;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create helper function to sync user metadata with profile role
-- This is useful when a user's role is changed directly in the profiles table
CREATE OR REPLACE FUNCTION public.sync_user_role_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if role has changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Attempt to update the user metadata (will work when called with appropriate permissions)
    BEGIN
      UPDATE auth.users
      SET raw_user_meta_data = 
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{role}',
          to_jsonb(NEW.role)
        )
      WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      RAISE NOTICE 'Failed to update user metadata: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to sync changes from profiles to user metadata
DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.sync_user_role_from_profile();

-- 6. Update permissions
GRANT EXECUTE ON FUNCTION public.update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION public.handle_new_user IS 
'Creates a user profile and sets the role from raw_user_meta_data during signup.';

COMMENT ON FUNCTION public.update_user_role IS 
'Updates a user role in the profiles table. Should be called after supabase.auth.updateUser() to ensure consistency.';

COMMENT ON FUNCTION public.sync_user_role_from_profile IS 
'Syncs the user role from the profiles table to user metadata when changed.';

-- 7. Reconfirm custom_access_token_hook permissions are properly set
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin; 
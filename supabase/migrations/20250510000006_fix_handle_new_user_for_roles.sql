-- Fix for handle_new_user function to populate both profiles and user_roles tables
-- This ensures consistent role handling across the application

-- Recreate the function with proper role handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DECLARE
    user_role text;
  BEGIN
    -- Extract role from raw_user_meta_data, otherwise default to 'customer'
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    
    -- 1. Insert into profiles table
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, user_role);
    
    -- 2. Insert into user_roles table
    -- Only proceed if the role is valid for app_role type
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, user_role::app_role);
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      RAISE WARNING 'Error inserting into user_roles table: %. User ID: %. Role: %',
        SQLERRM, NEW.id, user_role;
    END;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error details
    RAISE WARNING 'Error in handle_new_user function: %. User ID: %. Raw metadata: %',
      SQLERRM, NEW.id, NEW.raw_user_meta_data;
      
    -- Fall back to just creating a basic profile with customer role
    -- We want to ensure a profile is created even if there's an issue with the metadata
    BEGIN
      -- Insert into profiles with fallback role
      INSERT INTO public.profiles (id, role)
      VALUES (NEW.id, 'customer');
      
      -- Try to insert into user_roles with fallback role
      BEGIN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'customer'::app_role);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not insert fallback role into user_roles. User ID: %',
          NEW.id;
      END;
    EXCEPTION WHEN OTHERS THEN
      -- If even the fallback fails, log but don't fail the entire transaction
      RAISE WARNING 'Critical error in handle_new_user fallback: %. User ID: %',
        SQLERRM, NEW.id;
    END;
  END;
  
  -- Continue with the transaction regardless of profile creation success
  RETURN NEW;
END;
$$;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a user profile and user role entry when a new user signs up. Includes error handling and fallbacks.';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Create a trigger to sync profile roles to user_roles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_profile_role_updated'
  ) THEN
    CREATE TRIGGER on_profile_role_updated
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE PROCEDURE public.sync_profile_role_to_user_roles();
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating on_profile_role_updated trigger: %', SQLERRM;
END $$;

-- Define sync_profile_role_to_user_roles function if it doesn't exist
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if role has changed
  IF OLD.role IS DISTINCT FROM NEW.role AND NEW.role IS NOT NULL THEN
    -- Insert or update the role in user_roles
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, NEW.role::app_role)
      ON CONFLICT (user_id, role) 
      DO NOTHING;
      
      -- Delete any different roles for this user
      DELETE FROM public.user_roles
      WHERE user_id = NEW.id AND role::text != NEW.role;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error syncing profile role to user_roles: %. User ID: %. Role: %',
        SQLERRM, NEW.id, NEW.role;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.sync_profile_role_to_user_roles() IS 'Syncs profile role changes to the user_roles table to maintain consistency';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.sync_profile_role_to_user_roles() TO supabase_auth_admin;

-- Insert a record into migration_logs if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migration_logs') THEN
    INSERT INTO public.migration_logs (migration_name, description)
    VALUES ('20250510000006_fix_handle_new_user_for_roles', 'Updated handle_new_user to populate both profiles and user_roles tables')
    ON CONFLICT (migration_name) DO NOTHING;
  END IF;
END $$; 
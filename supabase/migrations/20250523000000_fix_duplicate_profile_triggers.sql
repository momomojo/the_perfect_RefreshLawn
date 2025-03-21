-- Description: Fix duplicate profile creation triggers
-- This migration addresses an issue where two triggers on auth.users both try to create profiles,
-- causing unique constraint violations when creating new users.

-- First, we'll log what we're doing
DO $$
BEGIN
  RAISE NOTICE 'Fixing duplicate profile creation triggers...';
END $$;

-- Drop the duplicate trigger
DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;

-- Modify the remaining function to be more robust by checking if profile exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Only create profile if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    -- Check if role exists in raw_user_meta_data, otherwise default to 'customer'
    INSERT INTO public.profiles (id, role)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    );
    
    -- Also ensure user_roles is in sync (if table exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
      -- Check if user_roles entry exists
      IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
        -- Insert user role if table exists and entry doesn't exist yet
        INSERT INTO public.user_roles (user_id, role)
        VALUES (
          NEW.id,
          (COALESCE(NEW.raw_user_meta_data->>'role', 'customer'))::public.app_role
        )
        ON CONFLICT (user_id, role) DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Set proper permissions: 
-- Service role and postgres should have execute permissions, but we should limit other roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Drop the unused function if it exists
-- We're keeping this commented out for safety, uncomment if you're sure it's not used elsewhere
-- DROP FUNCTION IF EXISTS public.create_profile_for_user();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Profile trigger fix completed successfully.';
END $$; 
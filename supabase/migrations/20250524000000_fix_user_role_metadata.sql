-- Description: Fix user role handling in user metadata
-- This migration updates the handle_new_user function to correctly check for roles in both
-- raw_user_meta_data->>'role' and raw_user_meta_data->'data'->>'role' paths.
-- This ensures the role is correctly retrieved whether it was set directly or via the data object
-- during signup with the signUpWithRole function.

-- First, we'll log what we're doing
DO $$
BEGIN
  RAISE NOTICE 'Updating handle_new_user function to better handle roles in metadata...';
END $$;

-- First, ensure the user_roles table has the proper constraint
DO $$
BEGIN
  -- Check if the user_roles table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    -- Check if the unique constraint exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
        AND table_name = 'user_roles' 
        AND constraint_name = 'user_roles_user_id_key'
    ) THEN
      -- If not, create it
      BEGIN
        EXECUTE 'ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id)';
        RAISE NOTICE 'Added unique constraint on user_id to user_roles table.';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add constraint: %', SQLERRM;
      END;
    END IF;
  END IF;
END $$;

-- Update the function to check for role in both locations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Only create profile if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    -- Determine the role first to avoid repeating the COALESCE logic
    user_role := COALESCE(
      NEW.raw_user_meta_data->>'role', 
      NEW.raw_user_meta_data->'data'->>'role',
      'customer'
    );
    
    -- Insert into profiles table
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, user_role);
    
    -- Also ensure user_roles is in sync (if table exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
      -- Insert user role if table exists - use simpler approach with no error potential
      BEGIN
        -- First try to insert
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, user_role::public.app_role);
      EXCEPTION WHEN OTHERS THEN
        -- If insert fails, try to update instead
        BEGIN
          -- If user already exists, update the role
          UPDATE public.user_roles 
          SET role = user_role::public.app_role
          WHERE user_id = NEW.id;
        EXCEPTION WHEN OTHERS THEN
          -- Silently continue if we can't update either
          -- This ensures user creation succeeds even if role assignment fails
          NULL;
        END;
      END;
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

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'handle_new_user function updated successfully.';
END $$; 
-- Description: Fix ON CONFLICT clause in handle_new_user function
-- This migration updates the handle_new_user function to use the correct constraint name in the ON CONFLICT clause.

-- First, we'll log what we're doing
DO $$
BEGIN
  RAISE NOTICE 'Fixing ON CONFLICT clause in handle_new_user function...';
END $$;

-- Update the function with the correct ON CONFLICT clause
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
      -- Simple insert/update approach with no ON CONFLICT clause
      BEGIN
        -- First check if the user already exists
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
          -- If not, insert a new record
          INSERT INTO public.user_roles (user_id, role)
          VALUES (NEW.id, user_role::public.app_role);
        ELSE
          -- If exists, update it
          UPDATE public.user_roles 
          SET role = user_role::public.app_role
          WHERE user_id = NEW.id;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Silently continue if we can't insert/update
        -- This ensures user creation succeeds even if role assignment fails
        RAISE NOTICE 'Could not set user role: %', SQLERRM;
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
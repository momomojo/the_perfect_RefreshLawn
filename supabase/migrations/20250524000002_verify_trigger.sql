-- Description: Ensure trigger is properly attached to auth.users
-- This migration checks if the handle_new_user trigger is properly attached to auth.users
-- and creates it if missing.

-- First, we'll log what we're doing
DO $$
BEGIN
  RAISE NOTICE 'Verifying handle_new_user trigger is properly attached...';
END $$;

-- Check if the trigger exists and recreate it if needed
DO $$
BEGIN
  -- Check if trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public' 
      AND event_object_schema = 'auth'
      AND event_object_table = 'users'
      AND trigger_name = 'on_auth_user_created'
  ) THEN
    -- Trigger doesn't exist, create it
    BEGIN
      -- Drop the trigger if it exists (in case it's somehow in an invalid state)
      EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
      
      -- Check if the handle_new_user function exists
      IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user' 
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ) THEN
        -- Create the trigger
        EXECUTE 'CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW
                EXECUTE FUNCTION public.handle_new_user()';
        RAISE NOTICE 'Created on_auth_user_created trigger on auth.users';
      ELSE
        RAISE NOTICE 'Could not create trigger: handle_new_user function does not exist';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create trigger: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created already exists on auth.users';
  END IF;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Trigger verification completed.';
END $$; 
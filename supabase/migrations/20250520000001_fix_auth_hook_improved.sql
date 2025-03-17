-- Migration: Fix Auth Hook with Improved Error Handling
-- Description: Improves the custom_access_token_hook with better error handling and logging
-- Version: 20250520000001

-- Drop existing function
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Recreate the function with improved error handling and proper STABLE volatility
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb) 
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  user_id uuid;
  user_role text;
  claims jsonb;
  debug_info jsonb;
BEGIN
  -- Extract the user ID from the event with better error handling
  BEGIN
    user_id := (event ->> 'user_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'custom_access_token_hook: Invalid user_id format: %', event ->> 'user_id';
    RETURN event;
  END;
  
  -- Early return if no user_id
  IF user_id IS NULL THEN
    RAISE WARNING 'custom_access_token_hook: No user_id provided in event';
    RETURN event;
  END IF;
  
  -- Get claims, initialize if not present
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  -- Get user role from user_roles table first (the authoritative source)
  BEGIN
    SELECT role::text INTO user_role 
    FROM public.user_roles 
    WHERE user_id = user_id
    LIMIT 1;
    
    IF user_role IS NULL THEN
      -- Log that no role was found in user_roles
      RAISE NOTICE 'custom_access_token_hook: No role found in user_roles for user %', user_id;
      
      -- Fallback to profiles table
      SELECT role INTO user_role 
      FROM public.profiles 
      WHERE id = user_id;
      
      IF user_role IS NOT NULL THEN
        -- If found in profiles but not in user_roles, synchronize them
        RAISE NOTICE 'custom_access_token_hook: Role found in profiles but not user_roles, synchronizing...';
        
        -- Insert into user_roles to keep consistent
        INSERT INTO public.user_roles(user_id, role)
        VALUES (user_id, user_role::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but continue
    RAISE WARNING 'custom_access_token_hook: Error retrieving role: %', SQLERRM;
  END;
  
  -- If still no role, default to customer
  IF user_role IS NULL THEN
    user_role := 'customer';
    RAISE NOTICE 'custom_access_token_hook: No role found, defaulting to customer for user %', user_id;
    
    -- Insert default role if tables exist
    BEGIN
      INSERT INTO public.user_roles(user_id, role)
      VALUES (user_id, user_role::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'custom_access_token_hook: Could not insert default role: %', SQLERRM;
    END;
  END IF;
  
  -- Now add the role to claims with proper error handling
  BEGIN
    -- Set user_role claim - standard location for our app
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    
    -- Also set in app_metadata for broader compatibility
    IF claims ? 'app_metadata' THEN
      claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
    ELSE
      claims := jsonb_set(claims, '{app_metadata}', jsonb_build_object('role', user_role));
    END IF;
    
    -- Update event with new claims
    event := jsonb_set(event, '{claims}', claims);
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but return original event
    RAISE WARNING 'custom_access_token_hook: Error setting claims: %', SQLERRM;
    RETURN event;
  END;
  
  RETURN event;
END;
$$;

-- Revoke unnecessary permissions and grant required ones
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Add helpful comment
COMMENT ON FUNCTION public.custom_access_token_hook IS 
'Hook to add user role to JWT claims. This function is called by GoTrue whenever a new JWT is created.';

-- Insert a record into migration_logs if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migration_logs') THEN
    INSERT INTO public.migration_logs (migration_name, description)
    VALUES ('20250520000001_fix_auth_hook_improved', 'Improved custom_access_token_hook with better error handling and logging')
    ON CONFLICT (migration_name) DO NOTHING;
  END IF;
END $$; 
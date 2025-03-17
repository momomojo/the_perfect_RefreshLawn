-- Migration: Check and Update Hooks
-- Description: Verifies and updates the custom_access_token_hook function and permissions
-- Version: 20250510000002

-- First check if the hook function exists and is proper
DO $$
BEGIN
  -- Check if the function exists
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'custom_access_token_hook') THEN
    RAISE WARNING 'custom_access_token_hook function does not exist!';
  ELSE
    RAISE NOTICE 'custom_access_token_hook function exists.';
  END IF;
END $$;

-- Re-apply custom access token hook function with fixes
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_claims jsonb;
BEGIN
  -- Extract the user ID from the event with safer error handling
  BEGIN
    v_user_id := (event ->> 'user_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If there's an error parsing the UUID, just log and return original event
    RAISE WARNING 'Invalid user_id in JWT hook: %', event ->> 'user_id';
    RETURN event;
  END;
  
  -- Early exit if user_id is null
  IF v_user_id IS NULL THEN
    RAISE WARNING 'Null user_id in JWT hook event: %', event;
    RETURN event;
  END IF;
  
  -- Get the claims from the event
  v_claims := COALESCE(event -> 'claims', '{}'::jsonb);
  
  -- Get the user's role, prioritizing user_roles table
  BEGIN
    -- First try to get role from user_roles table (primary source)
    SELECT role::text INTO v_user_role
    FROM public.user_roles
    WHERE user_id = v_user_id
    LIMIT 1;
    
    -- If not found in user_roles, try profiles table (fallback)
    IF v_user_role IS NULL THEN
      SELECT role INTO v_user_role
      FROM public.profiles
      WHERE id = v_user_id;
    END IF;
    
    -- Set default role if still null
    IF v_user_role IS NULL THEN
      v_user_role := 'customer';
      RAISE WARNING 'No role found for user %, defaulting to customer', v_user_id;
    END IF;
    
    -- Add the role to JWT claims in all expected locations
    -- 1. user_role (primary location per Supabase docs)
    v_claims := jsonb_set(v_claims, '{user_role}', to_jsonb(v_user_role));
    
    -- 2. app_metadata.role (common location)
    IF v_claims ? 'app_metadata' THEN
      v_claims := jsonb_set(v_claims, '{app_metadata,role}', to_jsonb(v_user_role));
    ELSE
      v_claims := jsonb_set(v_claims, '{app_metadata}', jsonb_build_object('role', v_user_role));
    END IF;
    
    -- Update the claims in the event
    event := jsonb_set(event, '{claims}', v_claims);
    
  EXCEPTION WHEN OTHERS THEN
    -- Log any errors but don't break authentication
    RAISE WARNING 'Error in custom_access_token_hook: %. Returning original event.', SQLERRM;
  END;
  
  -- Return the modified event (or original if there was an error)
  RETURN event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- Add detailed comment for documentation
COMMENT ON FUNCTION public.custom_access_token_hook IS
'Adds user role to JWT claims from user_roles table (primary) or profiles table (fallback).
This function must be enabled in the Supabase Dashboard under Authentication > Hooks.
It adds roles to the following locations in the JWT:
1. user_role - Primary location per Supabase docs
2. app_metadata.role - Common location for compatibility

IMPORTANT: After applying this migration, go to the Supabase Dashboard:
1. Go to Authentication > Hooks
2. For JWT Access Token event, select Database Function
3. Choose public.custom_access_token_hook
4. Save the changes'; 
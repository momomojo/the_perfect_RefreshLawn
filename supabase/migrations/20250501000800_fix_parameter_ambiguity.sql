-- Migration: Fix Parameter Ambiguity in Custom Access Token Hook
-- Description: Fixes parameter naming issues that could cause wrong variable references
-- Version: 20250501000800

-- Drop the hook first to ensure a clean implementation
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Create a function with fixed parameter naming
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_role app_role;
  v_claims jsonb;
  v_required_claims text[] := array['iss', 'aud', 'exp', 'iat', 'sub', 'role', 'aal', 'session_id'];
  v_missing_claims text[];
BEGIN
  -- Extract the user ID from the event with better variable naming
  BEGIN
    v_user_id := (event ->> 'user_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- Handle case where user_id is null or not a valid UUID
    RAISE WARNING 'Invalid or missing user_id in event: %', event;
    RETURN event;
  END;
  
  -- Early exit if user_id is null
  IF v_user_id IS NULL THEN
    RAISE WARNING 'Null user_id in custom_access_token_hook event';
    RETURN event;
  END IF;
  
  -- Get the claims from the event
  v_claims := COALESCE(event->'claims', '{}'::jsonb);
  
  -- Check for required claims
  v_missing_claims := array(
    SELECT r FROM unnest(v_required_claims) r
    WHERE NOT v_claims ? r
  );
  
  -- If required claims are missing, log but don't modify
  IF array_length(v_missing_claims, 1) > 0 THEN
    RAISE WARNING 'Missing required claims in event: %', v_missing_claims;
    RETURN event;
  END IF;
  
  -- Only proceed if we have all required claims and a valid user_id
  BEGIN
    -- Get the user's role from the user_roles table (fixed parameter naming)
    SELECT role INTO v_user_role 
    FROM public.user_roles 
    WHERE user_id = v_user_id
    LIMIT 1;
    
    -- If no role in user_roles, try profiles table as fallback
    IF v_user_role IS NULL THEN
      SELECT role::app_role INTO v_user_role 
      FROM public.profiles 
      WHERE id = v_user_id;
    END IF;
    
    -- If the user has a role, add it to the JWT claims
    IF v_user_role IS NOT NULL THEN
      -- Add the role to custom locations without modifying required claims
      v_claims := jsonb_set(v_claims, '{user_role}', to_jsonb(v_user_role));
      
      -- Set in app_metadata without replacing the entire object
      IF v_claims ? 'app_metadata' THEN
        v_claims := jsonb_set(v_claims, '{app_metadata,role}', to_jsonb(v_user_role));
      ELSE
        v_claims := jsonb_set(v_claims, '{app_metadata}', json_build_object('role', v_user_role)::jsonb);
      END IF;
      
      -- Update the claims in the event
      event := jsonb_set(event, '{claims}', v_claims);
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- On error, log it but return the original event
    RAISE WARNING 'Error in custom_access_token_hook: %', SQLERRM;
  END;
  
  -- Return the modified or original event
  RETURN event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure we have all necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- Add comment for dashboard setup instructions
COMMENT ON FUNCTION public.custom_access_token_hook IS 
'Fixed custom access token hook with improved variable naming to avoid parameter ambiguity.
Make sure this is enabled in the Supabase Dashboard under Authentication > Hooks.
After applying this migration, go to the Supabase Dashboard:
1. Go to Authentication > Hooks
2. For JWT Token event, select Database Function
3. Choose public.custom_access_token_hook
4. Click Save and then completely sign out and sign back in'; 
-- Migration: Fix Null User ID in Custom Access Token Hook
-- Description: Improves error handling for null user IDs in the hook
-- Version: 20250501000700

-- Drop the hook first to ensure a clean implementation
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Create an improved function with better null handling
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  user_id uuid;
  user_role app_role;
  claims jsonb;
  required_claims text[] := array['iss', 'aud', 'exp', 'iat', 'sub', 'role', 'aal', 'session_id'];
  missing_claims text[];
BEGIN
  -- Extract the user ID from the event
  BEGIN
    user_id := (event ->> 'user_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- Handle case where user_id is null or not a valid UUID
    RAISE WARNING 'Invalid or missing user_id in event: %', event;
    RETURN event;
  END;
  
  -- Early exit if user_id is null
  IF user_id IS NULL THEN
    RAISE WARNING 'Null user_id in custom_access_token_hook event';
    RETURN event;
  END IF;
  
  -- Get the claims from the event
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  -- Check for required claims
  missing_claims := array(
    SELECT r FROM unnest(required_claims) r
    WHERE NOT claims ? r
  );
  
  -- If required claims are missing, log but don't modify
  IF array_length(missing_claims, 1) > 0 THEN
    RAISE WARNING 'Missing required claims in event: %', missing_claims;
    RETURN event;
  END IF;
  
  -- Only proceed if we have all required claims and a valid user_id
  BEGIN
    -- Get the user's role from the user_roles table as per official docs
    SELECT role INTO user_role 
    FROM public.user_roles 
    WHERE user_id = user_id
    LIMIT 1;
    
    -- If no role in user_roles, try profiles table as fallback
    IF user_role IS NULL THEN
      SELECT role::app_role INTO user_role 
      FROM public.profiles 
      WHERE id = user_id;
    END IF;
    
    -- If the user has a role, add it to the JWT claims
    IF user_role IS NOT NULL THEN
      -- Add the role to custom locations without modifying required claims
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
      
      -- Set in app_metadata without replacing the entire object
      IF claims ? 'app_metadata' THEN
        claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
      ELSE
        claims := jsonb_set(claims, '{app_metadata}', json_build_object('role', user_role)::jsonb);
      END IF;
      
      -- Update the claims in the event
      event := jsonb_set(event, '{claims}', claims);
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

-- Check and remove any duplicate entries in user_roles
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id 
  AND a.user_id = b.user_id 
  AND a.role = b.role;

-- Add comment for dashboard setup instructions
COMMENT ON FUNCTION public.custom_access_token_hook IS 
'Fixed custom access token hook with improved null user_id handling.
Make sure this is enabled in the Supabase Dashboard under Authentication > Hooks.
After applying this migration, go to the Supabase Dashboard:
1. Go to Authentication > Hooks
2. For JWT Token event, select Database Function
3. Choose public.custom_access_token_hook
4. Click Save and then completely sign out and sign back in'; 
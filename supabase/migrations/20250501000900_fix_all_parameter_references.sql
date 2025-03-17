-- Migration: Fix All Parameter References in Access Token Hook
-- Description: Simplifies the function and fixes all parameter references to match Supabase documentation
-- Version: 20250501000900

-- Drop the hook first to ensure a clean implementation
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Create a simplified function that follows the exact example from Supabase docs
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_role text;
  event_user_id uuid;
BEGIN
  -- Extract the user ID from the event, using a different variable name to avoid ambiguity
  BEGIN
    event_user_id := (event ->> 'user_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- Early exit for invalid UUID
    RETURN event;
  END;
  
  -- Early exit if user_id is null
  IF event_user_id IS NULL THEN
    RETURN event;
  END IF;
  
  -- Get the claims from the event
  claims := event->'claims';
  IF claims IS NULL THEN
    claims := '{}'::jsonb;
  END IF;
  
  -- Get the user's role from the user_roles table - using explicit joining to avoid ambiguity
  SELECT ur.role::text INTO user_role 
  FROM public.user_roles ur 
  WHERE ur.user_id = event_user_id
  LIMIT 1;
  
  -- If no role in user_roles, try profiles table as fallback
  IF user_role IS NULL THEN
    SELECT p.role INTO user_role 
    FROM public.profiles p
    WHERE p.id = event_user_id;
  END IF;
  
  -- If the user has a role, add it to the JWT claims
  IF user_role IS NOT NULL THEN
    -- Add the role to standard locations
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
  
  -- Return the modified or original event
  RETURN event;
END;
$$ LANGUAGE plpgsql;

-- Make sure we have all necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- Add comment for dashboard setup instructions
COMMENT ON FUNCTION public.custom_access_token_hook IS 
'Simplified custom access token hook that follows Supabase documentation exactly.
Make sure this is enabled in the Supabase Dashboard under Authentication > Hooks.
After applying this migration, go to the Supabase Dashboard:
1. Go to Authentication > Hooks
2. For JWT Token event, select Database Function
3. Choose public.custom_access_token_hook
4. Click Save and sign out completely and sign back in'; 
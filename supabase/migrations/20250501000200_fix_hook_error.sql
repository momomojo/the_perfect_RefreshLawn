-- Migration: Fix Hook Error
-- Description: Fix issues with the custom access token hook
-- Version: 20250501000200

-- Drop the hook first to ensure a clean implementation
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Create the function with simpler error handling
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  user_id uuid;
  user_role text;
  claims jsonb;
BEGIN
  -- Extract the user ID from the event
  user_id := (event ->> 'user_id')::uuid;
  
  -- Get the claims from the event
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  BEGIN
    -- Get the user's role from the profiles table with error handling
    SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
    
    -- If the user has a role, add it to the JWT claims
    IF user_role IS NOT NULL THEN
      -- Add the role to standard locations for better compatibility
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
      
      -- Only try to set app_metadata if it exists or initialize it
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
    RAISE NOTICE 'Error in custom_access_token_hook: %', SQLERRM;
  END;
  
  -- Return the modified or original event
  RETURN event;
END;
$$ LANGUAGE plpgsql;

-- Re-apply permissions
-- Grant usage on schema public to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Grant execute on function to supabase_auth_admin - this is crucial
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Grant select on profiles table to supabase_auth_admin
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- Add comment reminding to enable the hook in dashboard
COMMENT ON FUNCTION public.custom_access_token_hook IS 
'Custom access token hook that adds user role to JWT claims. 
Make sure this is enabled in the Supabase Dashboard under Authentication > Hooks.
After applying this migration, go to the Supabase Dashboard:
1. Go to Authentication > Hooks
2. For JWT Access Token event, select Database Function
3. Choose public.custom_access_token_hook
4. Click Save'; 
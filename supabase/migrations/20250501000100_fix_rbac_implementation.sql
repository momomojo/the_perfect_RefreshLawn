-- Migration: Fix RBAC Implementation
-- Description: Update custom access token hook to follow Supabase best practices
-- Version: 20250501000100

-- 1. Update the custom access token hook to follow best practices and remove SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  user_id uuid;
  user_role text;
  claims jsonb;
BEGIN
  -- Extract the user ID from the event
  user_id := (event ->> 'user_id')::uuid;
  
  -- Get the user's role from the profiles table
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  
  -- Get the claims from the event
  claims := event->'claims';
  
  -- If the user has a role, add it to the JWT claims
  IF user_role IS NOT NULL THEN
    -- Add the role to standard locations for better compatibility:
    -- 1. user_role - standard claim location as per Supabase docs
    -- 2. app_metadata.role - commonly used location
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
    
    -- Update the claims in the event
    event := jsonb_set(event, '{claims}', claims);
  END IF;
  
  -- Return the modified or original event
  RETURN event;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure proper permissions are set for the supabase_auth_admin role
-- Grant usage on schema public to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Grant execute on function to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Grant select on profiles table to supabase_auth_admin
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- Revoke execute from other roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- 3. Update the helper functions to check for both user_role and app_metadata.role
-- Function to check if a user is an admin based on JWT claim
CREATE OR REPLACE FUNCTION auth.is_admin_jwt()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check role in standard locations
  RETURN (auth.jwt() ->> 'user_role')::text = 'admin' OR
         (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin' OR
         (auth.jwt() ->> 'role')::text = 'admin';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if a user is a technician based on JWT claim
CREATE OR REPLACE FUNCTION auth.is_technician_jwt()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check role in standard locations
  RETURN (auth.jwt() ->> 'user_role')::text = 'technician' OR
         (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'technician' OR
         (auth.jwt() ->> 'role')::text = 'technician';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if a user is a customer based on JWT claim
CREATE OR REPLACE FUNCTION auth.is_customer_jwt()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check role in standard locations
  RETURN (auth.jwt() ->> 'user_role')::text = 'customer' OR
         (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'customer' OR
         (auth.jwt() ->> 'role')::text = 'customer';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get the current user's role from the JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
DECLARE
  user_role text;
  app_metadata_role text;
  role_direct text;
BEGIN
  -- Try to get role from each location, in order of preference
  user_role := (auth.jwt() ->> 'user_role')::text;
  app_metadata_role := (auth.jwt() -> 'app_metadata' ->> 'role')::text;
  role_direct := (auth.jwt() ->> 'role')::text;
  
  -- Return the first non-null value
  RETURN COALESCE(user_role, app_metadata_role, role_direct);
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment reminding to enable the hook in dashboard
COMMENT ON FUNCTION public.custom_access_token_hook IS 
'Custom access token hook that adds user role to JWT claims. 
Make sure this is enabled in the Supabase Dashboard under Authentication > Hooks.'; 
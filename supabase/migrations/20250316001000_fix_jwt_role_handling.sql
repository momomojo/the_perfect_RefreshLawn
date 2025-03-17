-- Migration: Fix JWT Role Handling
-- Description: Updates JWT role handling to ensure all roles work correctly
-- Version: 20250316001000

-- 1. Update profile creation to respect role in user metadata
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
DECLARE
  role_val text;
BEGIN
  -- Check if role is provided in user metadata
  role_val := NEW.raw_user_meta_data->>'role';
  
  -- If no role specified, default to 'customer'
  IF role_val IS NULL OR role_val = '' THEN
    role_val := 'customer';
  END IF;
  
  -- Create profile with specified or default role
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, role_val);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the custom access token hook to add role to both locations
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  user_id uuid;
  user_role text;
BEGIN
  -- Extract the user ID from the event
  user_id := (event ->> 'user_id')::uuid;
  
  -- Get the user's role from the profiles table
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  
  -- If the user has a role, add it to the JWT claims
  IF user_role IS NOT NULL THEN
    -- Add the role to both metadata.role (for our helper functions) 
    -- and app_metadata.role (for client access)
    RETURN jsonb_set(
      jsonb_set(
        event,
        '{metadata}',
        jsonb_set(
          COALESCE(event -> 'metadata', '{}'::jsonb),
          '{role}',
          to_jsonb(user_role)
        )
      ),
      '{app_metadata}',
      jsonb_set(
        COALESCE(event -> 'app_metadata', '{}'::jsonb),
        '{role}',
        to_jsonb(user_role)
      )
    );
  ELSE
    -- If no role found, return the original event
    RETURN event;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the helper functions to check for role in both locations
-- Function to check if a user is an admin based on JWT claim
CREATE OR REPLACE FUNCTION auth.is_admin_jwt()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check role in both possible locations
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin' OR
         (auth.jwt() ->> 'role')::text = 'admin';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if a user is a technician based on JWT claim
CREATE OR REPLACE FUNCTION auth.is_technician_jwt()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check role in both possible locations
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'technician' OR
         (auth.jwt() ->> 'role')::text = 'technician';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if a user is a customer based on JWT claim
CREATE OR REPLACE FUNCTION auth.is_customer_jwt()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check role in both possible locations
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'customer' OR
         (auth.jwt() ->> 'role')::text = 'customer';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get the current user's role from the JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
DECLARE
  role_from_metadata text;
  role_direct text;
BEGIN
  -- Try to get role from app_metadata first
  role_from_metadata := (auth.jwt() -> 'app_metadata' ->> 'role')::text;
  
  -- If not found, try to get from direct claim
  role_direct := (auth.jwt() ->> 'role')::text;
  
  -- Return the first non-null value
  RETURN COALESCE(role_from_metadata, role_direct);
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Function to update all existing users' metadata with their roles
CREATE OR REPLACE FUNCTION public.update_all_user_roles_in_metadata()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users and update their metadata
  FOR user_record IN SELECT auth.users.id, profiles.role FROM auth.users JOIN profiles ON auth.users.id = profiles.id
  LOOP
    -- Update the user's raw_app_meta_data with their role
    UPDATE auth.users 
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', user_record.role)
    WHERE id = user_record.id;
    
    -- Update the user's raw_user_meta_data with their role if it doesn't exist
    UPDATE auth.users 
    SET raw_user_meta_data = 
      CASE
        WHEN raw_user_meta_data->>'role' IS NULL THEN 
          raw_user_meta_data || jsonb_build_object('role', user_record.role)
        ELSE
          raw_user_meta_data
      END
    WHERE id = user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Execute the function to update all existing users
SELECT public.update_all_user_roles_in_metadata(); 
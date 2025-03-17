-- Migration: JWT Helper Functions
-- Description: Sets up JWT helper functions for role-based access control
-- Version: 20250315000200

-- JWT claims helper function to fetch the role from the JWT
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb AS $$
DECLARE
  _role text;
  result jsonb;
BEGIN
  -- Extract role from auth.jwt() claims
  result := current_setting('request.jwt.claims', true)::jsonb;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to add user's role to the JWT
CREATE OR REPLACE FUNCTION public.add_user_role_to_jwt() 
RETURNS trigger AS $$
DECLARE
  role_val text;
BEGIN
  -- Get the user's role from the profiles table
  SELECT role INTO role_val FROM public.profiles WHERE id = NEW.id;
  
  -- Add the role to the user's metadata
  IF role_val IS NOT NULL THEN
    NEW.raw_app_meta_data := 
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', role_val);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that adds the role when a user signs up
DROP TRIGGER IF EXISTS add_role_on_user_creation ON auth.users;
CREATE TRIGGER add_role_on_user_creation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.add_user_role_to_jwt();

-- Create a trigger that updates the role on user login
DROP TRIGGER IF EXISTS add_role_on_user_login ON auth.users;
CREATE TRIGGER add_role_on_user_login
  BEFORE UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.add_user_role_to_jwt();

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
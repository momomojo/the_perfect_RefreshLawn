-- Migration: Add Role Management Functions
-- Description: Create RPC functions for easily managing user roles
-- Version: 20250501000500

-- 1. Create a function to update a user's role safely
CREATE OR REPLACE FUNCTION public.update_user_role_safe(p_user_id UUID, p_role text)
RETURNS void AS $$
BEGIN
  -- Delete any existing roles for this user
  DELETE FROM public.user_roles
  WHERE user_id = p_user_id;
  
  -- Insert the new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role::app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to get a user's current role 
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID DEFAULT auth.uid())
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  -- Get role from user_roles table
  SELECT role::text INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- If not found, try profiles table as fallback
  IF v_role IS NULL THEN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Function to check if the current user is a technician
CREATE OR REPLACE FUNCTION public.is_technician()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_user_role() = 'technician';
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Function to check if the current user is a customer
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_user_role() = 'customer';
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_role_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_technician TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_customer TO authenticated, anon;

-- Add helpful comments
COMMENT ON FUNCTION public.update_user_role_safe IS 
'Updates a user''s role in the user_roles table safely by ensuring only one role exists.';

COMMENT ON FUNCTION public.get_user_role IS 
'Gets a user''s current role from user_roles table or profiles table as fallback.';

COMMENT ON FUNCTION public.is_admin IS 
'Checks if the current user has the admin role.';

COMMENT ON FUNCTION public.is_technician IS 
'Checks if the current user has the technician role.';

COMMENT ON FUNCTION public.is_customer IS 
'Checks if the current user has the customer role.'; 
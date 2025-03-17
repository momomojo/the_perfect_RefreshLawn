-- Migration: Update JWT Role Policies
-- Description: Updates existing role-based policies to use JWT claims for better performance
-- Version: 20250501001000

-- 1. Update the role check functions to prioritize JWT claims for better performance

-- Function to check if the user is an admin (improved version)
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- First check JWT claims (faster)
    IF (auth.jwt() ->> 'user_role')::text = 'admin' OR
       (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Fallback to database check (slower but ensures compatibility)
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the user is a technician (improved version)
CREATE OR REPLACE FUNCTION auth.is_technician()
RETURNS BOOLEAN AS $$
BEGIN
    -- First check JWT claims (faster)
    IF (auth.jwt() ->> 'user_role')::text = 'technician' OR
       (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'technician' THEN
        RETURN TRUE;
    END IF;
    
    -- Fallback to database check
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'technician'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the user is a customer (improved version)
CREATE OR REPLACE FUNCTION auth.is_customer()
RETURNS BOOLEAN AS $$
BEGIN
    -- First check JWT claims (faster)
    IF (auth.jwt() ->> 'user_role')::text = 'customer' OR
       (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'customer' THEN
        RETURN TRUE;
    END IF;
    
    -- Fallback to database check
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'customer'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add helper function to get user role directly from JWT
CREATE OR REPLACE FUNCTION auth.get_jwt_role()
RETURNS TEXT AS $$
DECLARE
    role_value TEXT;
BEGIN
    -- Try to get role from various places in JWT
    role_value := (auth.jwt() ->> 'user_role')::text;
    
    -- If not found, try app_metadata
    IF role_value IS NULL THEN
        role_value := (auth.jwt() -> 'app_metadata' ->> 'role')::text;
    END IF;
    
    RETURN role_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Create direct auth.is_role_customer() function for explicit JWT check
-- This can be used in performance-critical policies
CREATE OR REPLACE FUNCTION auth.is_role_customer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.jwt() ->> 'user_role')::text = 'customer' OR
           (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'customer';
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Create direct auth.is_role_technician() function for explicit JWT check
CREATE OR REPLACE FUNCTION auth.is_role_technician()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.jwt() ->> 'user_role')::text = 'technician' OR
           (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'technician';
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Create direct auth.is_role_admin() function for explicit JWT check
CREATE OR REPLACE FUNCTION auth.is_role_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.jwt() ->> 'user_role')::text = 'admin' OR
           (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin';
END;
$$ LANGUAGE plpgsql STABLE;

-- Add helpful comments
COMMENT ON FUNCTION auth.is_admin IS 
'Checks if the current user is an admin - first checks JWT claims then falls back to database.';

COMMENT ON FUNCTION auth.is_technician IS 
'Checks if the current user is a technician - first checks JWT claims then falls back to database.';

COMMENT ON FUNCTION auth.is_customer IS 
'Checks if the current user is a customer - first checks JWT claims then falls back to database.';

COMMENT ON FUNCTION auth.get_jwt_role IS 
'Returns the user role directly from JWT claims without database lookup.';

COMMENT ON FUNCTION auth.is_role_customer IS 
'Direct JWT check for customer role without database fallback - use for performance-critical policies.';

COMMENT ON FUNCTION auth.is_role_technician IS 
'Direct JWT check for technician role without database fallback - use for performance-critical policies.';

COMMENT ON FUNCTION auth.is_role_admin IS 
'Direct JWT check for admin role without database fallback - use for performance-critical policies.'; 
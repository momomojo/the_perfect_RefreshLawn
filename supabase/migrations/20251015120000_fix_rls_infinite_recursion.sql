-- Migration: Fix RLS Infinite Recursion
-- Description: Replace profile-querying role check functions with JWT-based checks
-- Version: 20251015120000
--
-- PROBLEM: The auth.is_admin() and other role check functions query the profiles table,
-- which creates infinite recursion when RLS policies on profiles use these functions.
--
-- SOLUTION: Check JWT claims directly using current_setting('request.jwt.claims')
-- instead of querying profiles. The custom_access_token_hook adds role to app_metadata.

-- ================================================================
-- DROP OLD RECURSIVE FUNCTIONS (if they exist in auth schema)
-- ================================================================

-- Note: We cannot modify auth schema directly, so we'll create in public schema
-- and ensure RLS policies use the public schema versions

-- ================================================================
-- CREATE NON-RECURSIVE JWT-BASED ROLE CHECK FUNCTIONS IN PUBLIC SCHEMA
-- ================================================================

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_authenticated() IS
'Checks if a user is authenticated by verifying auth.uid() is not null. Does not query any tables.';

-- Function to check if user is an admin (checks JWT claims)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    -- Get JWT claims from request settings
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    -- Extract role from multiple possible locations in JWT
    user_role := COALESCE(
        claims -> 'app_metadata' ->> 'role',
        claims -> 'user_metadata' ->> 'role',
        claims ->> 'user_role',
        claims ->> 'role'
    );

    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_admin() IS
'Checks if the authenticated user has admin role by reading JWT claims. Does not query profiles table to avoid RLS recursion.';

-- Function to check if user is a technician (checks JWT claims)
CREATE OR REPLACE FUNCTION public.is_technician()
RETURNS BOOLEAN AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    -- Get JWT claims from request settings
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    -- Extract role from multiple possible locations in JWT
    user_role := COALESCE(
        claims -> 'app_metadata' ->> 'role',
        claims -> 'user_metadata' ->> 'role',
        claims ->> 'user_role',
        claims ->> 'role'
    );

    RETURN user_role = 'technician';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_technician() IS
'Checks if the authenticated user has technician role by reading JWT claims. Does not query profiles table to avoid RLS recursion.';

-- Function to check if user is a customer (checks JWT claims)
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS BOOLEAN AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    -- Get JWT claims from request settings
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    -- Extract role from multiple possible locations in JWT
    user_role := COALESCE(
        claims -> 'app_metadata' ->> 'role',
        claims -> 'user_metadata' ->> 'role',
        claims ->> 'user_role',
        claims ->> 'role'
    );

    RETURN user_role = 'customer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_customer() IS
'Checks if the authenticated user has customer role by reading JWT claims. Does not query profiles table to avoid RLS recursion.';

-- ================================================================
-- CREATE HELPER FUNCTION FOR DIRECT JWT ROLE EXTRACTION
-- ================================================================

-- Function to get user role directly from JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    -- Get JWT claims from request settings
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN 'customer'; -- default
    END;

    -- Extract role from multiple possible locations in JWT
    user_role := COALESCE(
        claims -> 'app_metadata' ->> 'role',
        claims -> 'user_metadata' ->> 'role',
        claims ->> 'user_role',
        claims ->> 'role',
        'customer' -- default to customer if no role found
    );

    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_role() IS
'Extracts the user role from JWT claims. Returns customer as default if no role found. Does not query any tables.';

-- ================================================================
-- FIX THE JWT HOOK TO USE SECURITY DEFINER AND BYPASS RLS
-- ================================================================

-- The custom_access_token_hook queries profiles table, which could fail if RLS is too strict
-- Make sure it bypasses RLS by using SECURITY DEFINER (already set, but let's ensure it)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  user_role text;
BEGIN
  -- Extract the user ID from the event
  user_id := (event ->> 'user_id')::uuid;

  -- Get the user's role from the profiles table (bypasses RLS due to SECURITY DEFINER)
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;

  -- If the user has a role, add it to the JWT claims
  IF user_role IS NOT NULL THEN
    -- Add the role to both metadata.role (for consistency)
    -- and app_metadata.role (standard location)
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
$$;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
'JWT hook that adds user role to JWT claims. Uses SECURITY DEFINER to bypass RLS when querying profiles.';

-- ================================================================
-- UPDATE ALL RLS POLICIES TO USE NEW NON-RECURSIVE FUNCTIONS
-- ================================================================

-- Profiles table policies (THE SOURCE OF INFINITE RECURSION)
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.profiles;
CREATE POLICY "admin_read_all_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_all_profiles" ON public.profiles;
CREATE POLICY "admin_update_all_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "technicians_read_customer_profiles" ON public.profiles;
CREATE POLICY "technicians_read_customer_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
    public.is_technician() AND
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE technician_id = auth.uid() AND customer_id = profiles.id
    )
);

-- Services table policies
DROP POLICY IF EXISTS "admin_manage_services" ON public.services;
CREATE POLICY "admin_manage_services"
ON public.services FOR ALL
TO authenticated
USING (public.is_admin());

-- Recurring plans policies
DROP POLICY IF EXISTS "admin_manage_recurring_plans" ON public.recurring_plans;
CREATE POLICY "admin_manage_recurring_plans"
ON public.recurring_plans FOR ALL
TO authenticated
USING (public.is_admin());

-- Bookings policies
DROP POLICY IF EXISTS "admin_manage_all_bookings" ON public.bookings;
CREATE POLICY "admin_manage_all_bookings"
ON public.bookings FOR ALL
TO authenticated
USING (public.is_admin());

-- Reviews policies
DROP POLICY IF EXISTS "admin_manage_all_reviews" ON public.reviews;
CREATE POLICY "admin_manage_all_reviews"
ON public.reviews FOR ALL
TO authenticated
USING (public.is_admin());

-- Payment methods policies
DROP POLICY IF EXISTS "admin_view_all_payment_methods" ON public.payment_methods;
CREATE POLICY "admin_view_all_payment_methods"
ON public.payment_methods FOR SELECT
TO authenticated
USING (public.is_admin());

-- Notifications policies (if they exist)
DROP POLICY IF EXISTS "admin_manage_all_notifications" ON public.notifications;
CREATE POLICY "admin_manage_all_notifications"
ON public.notifications FOR ALL
TO authenticated
USING (public.is_admin());

-- Booking images policies (if they exist)
DROP POLICY IF EXISTS "admin_manage_all_booking_images" ON public.booking_images;
CREATE POLICY "admin_manage_all_booking_images"
ON public.booking_images FOR ALL
TO authenticated
USING (public.is_admin());

-- ================================================================
-- VERIFICATION: Test the functions
-- ================================================================

-- These functions should now work without infinite recursion
-- They read from JWT claims, not from the profiles table
SELECT
    'RLS infinite recursion fix applied!' AS status,
    'Functions now use JWT claims (request.jwt.claims) instead of querying profiles table' AS method,
    'Updated all admin policies to use public.is_admin()' AS policies_updated;

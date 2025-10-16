-- ========================================
-- EMERGENCY RLS INFINITE RECURSION FIX
-- ========================================
-- Run this directly in Supabase SQL Editor if you need immediate fix
-- URL: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/sql/new
--
-- This is a consolidated version of migrations:
-- - 20251015120000_fix_rls_infinite_recursion.sql
-- - 20251015120001_fix_remaining_rls_recursion.sql
--
-- Copy and paste this entire file into SQL Editor and click "Run"
-- ========================================

BEGIN;

-- ================================================================
-- STEP 1: CREATE NON-RECURSIVE ROLE CHECK FUNCTIONS
-- ================================================================

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is an admin (reads JWT, no table query)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    user_role := COALESCE(
        claims -> 'app_metadata' ->> 'role',
        claims -> 'user_metadata' ->> 'role',
        claims ->> 'user_role',
        claims ->> 'role'
    );

    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is a technician
CREATE OR REPLACE FUNCTION public.is_technician()
RETURNS BOOLEAN AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    user_role := COALESCE(
        claims -> 'app_metadata' ->> 'role',
        claims -> 'user_metadata' ->> 'role',
        claims ->> 'user_role',
        claims ->> 'role'
    );

    RETURN user_role = 'technician';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is a customer
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS BOOLEAN AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    user_role := COALESCE(
        claims -> 'app_metadata' ->> 'role',
        claims -> 'user_metadata' ->> 'role',
        claims ->> 'user_role',
        claims ->> 'role'
    );

    RETURN user_role = 'customer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN 'customer';
    END;

    user_role := COALESCE(
        claims -> 'app_metadata' ->> 'role',
        claims -> 'user_metadata' ->> 'role',
        claims ->> 'user_role',
        claims ->> 'role',
        'customer'
    );

    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ================================================================
-- STEP 2: FIX JWT HOOK TO BYPASS RLS
-- ================================================================

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
  user_id := (event ->> 'user_id')::uuid;
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;

  IF user_role IS NOT NULL THEN
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
    RETURN event;
  END IF;
END;
$$;

-- ================================================================
-- STEP 3: UPDATE ALL RLS POLICIES TO USE NEW FUNCTIONS
-- ================================================================

-- PROFILES TABLE (SOURCE OF RECURSION)
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.profiles;
CREATE POLICY "admin_read_all_profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_all_profiles" ON public.profiles;
CREATE POLICY "admin_update_all_profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "technicians_read_customer_profiles" ON public.profiles;
CREATE POLICY "technicians_read_customer_profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
    public.is_technician() AND
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE technician_id = auth.uid() AND customer_id = profiles.id
    )
);

-- SERVICES TABLE
DROP POLICY IF EXISTS "admin_manage_services" ON public.services;
CREATE POLICY "admin_manage_services"
ON public.services FOR ALL TO authenticated
USING (public.is_admin());

-- RECURRING PLANS TABLE
DROP POLICY IF EXISTS "admin_manage_recurring_plans" ON public.recurring_plans;
CREATE POLICY "admin_manage_recurring_plans"
ON public.recurring_plans FOR ALL TO authenticated
USING (public.is_admin());

-- BOOKINGS TABLE
DROP POLICY IF EXISTS "admin_manage_all_bookings" ON public.bookings;
CREATE POLICY "admin_manage_all_bookings"
ON public.bookings FOR ALL TO authenticated
USING (public.is_admin());

-- REVIEWS TABLE
DROP POLICY IF EXISTS "admin_manage_all_reviews" ON public.reviews;
CREATE POLICY "admin_manage_all_reviews"
ON public.reviews FOR ALL TO authenticated
USING (public.is_admin());

-- PAYMENT METHODS TABLE
DROP POLICY IF EXISTS "admin_view_all_payment_methods" ON public.payment_methods;
CREATE POLICY "admin_view_all_payment_methods"
ON public.payment_methods FOR SELECT TO authenticated
USING (public.is_admin());

-- NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "admin_manage_all_notifications" ON public.notifications;
CREATE POLICY "admin_manage_all_notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.is_admin());

-- BOOKING IMAGES TABLE
DROP POLICY IF EXISTS "admin_manage_all_booking_images" ON public.booking_images;
CREATE POLICY "admin_manage_all_booking_images"
ON public.booking_images FOR ALL TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "allow_admin_select_booking_images" ON public.booking_images;
CREATE POLICY "allow_admin_select_booking_images"
ON public.booking_images FOR SELECT TO authenticated
USING (public.is_admin());

-- STRIPE TABLES
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
CREATE POLICY "Admins can view all customers"
ON public.customers FOR ALL TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
ON public.payments FOR ALL TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions FOR ALL TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;
CREATE POLICY "Admins can view all invoices"
ON public.invoices FOR ALL TO authenticated
USING (public.is_admin());

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Test that functions exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        RAISE EXCEPTION 'Function public.is_admin() was not created!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_technician' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        RAISE EXCEPTION 'Function public.is_technician() was not created!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_customer' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        RAISE EXCEPTION 'Function public.is_customer() was not created!';
    END IF;

    RAISE NOTICE 'All functions created successfully!';
END $$;

COMMIT;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

SELECT
    'RLS INFINITE RECURSION FIX APPLIED!' AS status,
    'All policies updated to use JWT-based role checks' AS result,
    'Try running: SELECT * FROM profiles WHERE id = auth.uid();' AS next_step;

-- ================================================================
-- POST-DEPLOYMENT TESTS
-- ================================================================
-- Run these individually after the main fix completes:

-- Test 1: Check your role
-- SELECT public.get_user_role() AS my_role, public.is_admin() AS i_am_admin;

-- Test 2: Query profiles (was failing before)
-- SELECT * FROM profiles WHERE id = auth.uid();

-- Test 3: Query services (was also failing)
-- SELECT * FROM services WHERE is_active = true LIMIT 5;

-- Test 4: List all new functions
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public' AND routine_name IN ('is_admin', 'is_technician', 'is_customer', 'get_user_role');

-- Migration: Fix RLS Policies
-- Description: Improves RLS policies for better security
-- Version: 20250520000003

-- 1. Fix reviews table policy - restrict public access to only approved reviews
DROP POLICY IF EXISTS public_read_reviews ON reviews;
CREATE POLICY public_read_reviews
    ON reviews FOR SELECT
    USING (rating >= 4); -- Only expose highly rated reviews to the public

-- 2. Update the function to standardize role checking using more secure auth-based queries
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.is_technician()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'technician'::app_role
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'customer'::app_role
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 3. Add missing WITH CHECK clauses for bookings
DROP POLICY IF EXISTS customers_create_bookings ON bookings;
CREATE POLICY customers_create_bookings
    ON bookings FOR INSERT
    WITH CHECK (
        customer_id = auth.uid() AND
        public.is_customer() -- Only customers can create bookings
    );

-- 4. Create helper function for verifying legitimate booking assignments
CREATE OR REPLACE FUNCTION public.is_valid_booking_assignment(booking_id uuid, tech_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check that the booking exists and the technician is assigned to it
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE id = booking_id AND technician_id = tech_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 5. Secure the user_roles table with proper RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage user roles
CREATE POLICY admin_manage_user_roles
    ON user_roles FOR ALL
    USING (public.is_admin());

-- Users can read their own role
CREATE POLICY users_read_own_roles
    ON user_roles FOR SELECT
    USING (user_id = auth.uid());

-- 6. Add more descriptive comments to policies
COMMENT ON POLICY admin_manage_user_roles ON user_roles IS 
'Only administrators can manage user roles.';

COMMENT ON POLICY users_read_own_roles ON user_roles IS 
'Users can view their own role assignments.';

COMMENT ON POLICY public_read_reviews ON reviews IS 
'Only highly rated reviews (4-5 stars) are publicly visible.';

-- Insert a record into migration_logs if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migration_logs') THEN
    INSERT INTO public.migration_logs (migration_name, description)
    VALUES ('20250520000003_fix_rls_policies', 'Improved RLS policies for better security')
    ON CONFLICT (migration_name) DO NOTHING;
  END IF;
END $$; 
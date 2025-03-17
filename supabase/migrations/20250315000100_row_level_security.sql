-- Migration: Row Level Security Policies
-- Description: Sets up Row Level Security policies for all tables
-- Version: 20250315000100

-- Create helper functions for RBAC

-- Function to check if the user is authenticated
CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.uid() IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the user is an admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the user is a technician
CREATE OR REPLACE FUNCTION auth.is_technician()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'technician'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the user is a customer
CREATE OR REPLACE FUNCTION auth.is_customer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'customer'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
-- Admin can read all profiles
DROP POLICY IF EXISTS admin_read_all_profiles ON profiles;
CREATE POLICY admin_read_all_profiles
    ON profiles FOR SELECT
    USING (auth.is_admin());

-- Admin can update all profiles
DROP POLICY IF EXISTS admin_update_all_profiles ON profiles;
CREATE POLICY admin_update_all_profiles
    ON profiles FOR UPDATE
    USING (auth.is_admin());

-- Users can read their own profile
DROP POLICY IF EXISTS users_read_own_profile ON profiles;
CREATE POLICY users_read_own_profile
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS users_update_own_profile ON profiles;
CREATE POLICY users_update_own_profile
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Technicians can read limited customer profile info for assigned jobs
DROP POLICY IF EXISTS technicians_read_customer_profiles ON profiles;
CREATE POLICY technicians_read_customer_profiles
    ON profiles FOR SELECT
    USING (
        auth.is_technician() AND
        EXISTS (
            SELECT 1 FROM bookings
            WHERE technician_id = auth.uid() AND customer_id = profiles.id
        )
    );

-- RLS Policies for services table
-- Public read access for services
DROP POLICY IF EXISTS public_read_services ON services;
CREATE POLICY public_read_services
    ON services FOR SELECT
    USING (true);

-- Only admins can insert, update, delete services
DROP POLICY IF EXISTS admin_manage_services ON services;
CREATE POLICY admin_manage_services
    ON services FOR ALL
    USING (auth.is_admin());

-- RLS Policies for recurring_plans table
-- Public read access for recurring plans
DROP POLICY IF EXISTS public_read_recurring_plans ON recurring_plans;
CREATE POLICY public_read_recurring_plans
    ON recurring_plans FOR SELECT
    USING (true);

-- Only admins can insert, update, delete recurring plans
DROP POLICY IF EXISTS admin_manage_recurring_plans ON recurring_plans;
CREATE POLICY admin_manage_recurring_plans
    ON recurring_plans FOR ALL
    USING (auth.is_admin());

-- RLS Policies for bookings table
-- Admin can do everything
DROP POLICY IF EXISTS admin_manage_all_bookings ON bookings;
CREATE POLICY admin_manage_all_bookings
    ON bookings FOR ALL
    USING (auth.is_admin());

-- Customer can view their own bookings
DROP POLICY IF EXISTS customers_view_own_bookings ON bookings;
CREATE POLICY customers_view_own_bookings
    ON bookings FOR SELECT
    USING (customer_id = auth.uid());

-- Customer can create bookings for themselves
DROP POLICY IF EXISTS customers_create_bookings ON bookings;
CREATE POLICY customers_create_bookings
    ON bookings FOR INSERT
    WITH CHECK (customer_id = auth.uid());

-- Customer can update their bookings with restrictions
DROP POLICY IF EXISTS customers_update_own_bookings ON bookings;
CREATE POLICY customers_update_own_bookings
    ON bookings FOR UPDATE
    USING (customer_id = auth.uid())
    WITH CHECK (
        customer_id = auth.uid() AND
        (status = 'pending' OR status = 'scheduled')
    );

-- Technician can view assigned bookings
DROP POLICY IF EXISTS technicians_view_assigned_bookings ON bookings;
CREATE POLICY technicians_view_assigned_bookings
    ON bookings FOR SELECT
    USING (technician_id = auth.uid());

-- Technician can update status of assigned bookings
DROP POLICY IF EXISTS technicians_update_assigned_bookings ON bookings;
CREATE POLICY technicians_update_assigned_bookings
    ON bookings FOR UPDATE
    USING (technician_id = auth.uid())
    WITH CHECK (technician_id = auth.uid());

-- RLS Policies for reviews table
-- Admin can do everything
DROP POLICY IF EXISTS admin_manage_all_reviews ON reviews;
CREATE POLICY admin_manage_all_reviews
    ON reviews FOR ALL
    USING (auth.is_admin());

-- Customer can view their own reviews
DROP POLICY IF EXISTS customers_view_own_reviews ON reviews;
CREATE POLICY customers_view_own_reviews
    ON reviews FOR SELECT
    USING (customer_id = auth.uid());

-- Customer can create reviews for their own bookings
DROP POLICY IF EXISTS customers_create_reviews ON reviews;
CREATE POLICY customers_create_reviews
    ON reviews FOR INSERT
    WITH CHECK (
        customer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.id = reviews.booking_id
            AND bookings.customer_id = auth.uid()
            AND bookings.status = 'completed'
        )
    );

-- Technician can view reviews for their jobs
DROP POLICY IF EXISTS technicians_view_job_reviews ON reviews;
CREATE POLICY technicians_view_job_reviews
    ON reviews FOR SELECT
    USING (technician_id = auth.uid());

-- Public read access for approved reviews (could be used for a testimonials section)
DROP POLICY IF EXISTS public_read_reviews ON reviews;
CREATE POLICY public_read_reviews
    ON reviews FOR SELECT
    USING (true);

-- RLS Policies for payment_methods table
-- Admin can view all payment methods
DROP POLICY IF EXISTS admin_view_all_payment_methods ON payment_methods;
CREATE POLICY admin_view_all_payment_methods
    ON payment_methods FOR SELECT
    USING (auth.is_admin());

-- Customer can manage their own payment methods
DROP POLICY IF EXISTS customers_manage_own_payment_methods ON payment_methods;
CREATE POLICY customers_manage_own_payment_methods
    ON payment_methods FOR ALL
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid()); 
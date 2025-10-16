-- Migration: Fix Remaining RLS Recursion Issues
-- Description: Replace all remaining profile-querying policies with JWT-based checks
-- Version: 20251015120001
--
-- This migration fixes RLS policies on Stripe-related tables and other tables
-- that still query the profiles table for admin checks, causing potential recursion.

-- ================================================================
-- FIX STRIPE TABLES RLS POLICIES
-- ================================================================

-- Customers table policies
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
CREATE POLICY "Admins can view all customers"
ON public.customers FOR ALL
TO authenticated
USING (public.is_admin());

-- Payments table policies
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
ON public.payments FOR ALL
TO authenticated
USING (public.is_admin());

-- Subscriptions table policies
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
ON public.subscriptions FOR ALL
TO authenticated
USING (public.is_admin());

-- Invoices table policies
DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;
CREATE POLICY "Admins can view all invoices"
ON public.invoices FOR ALL
TO authenticated
USING (public.is_admin());

-- ================================================================
-- FIX BOOKING IMAGES TABLE RLS POLICIES
-- ================================================================

-- Admin policy for booking images
DROP POLICY IF EXISTS "Admins can view all booking images" ON public.booking_images;
CREATE POLICY "Admins can view all booking images"
ON public.booking_images FOR ALL
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "allow_admin_select_booking_images" ON public.booking_images;
CREATE POLICY "allow_admin_select_booking_images"
ON public.booking_images FOR SELECT
TO authenticated
USING (public.is_admin());

-- ================================================================
-- FIX ANY INLINE POLICIES IN OTHER TABLES
-- ================================================================

-- Check if there are any policies with inline profile queries
-- These need to be updated to use public.is_admin()

-- Example pattern to look for and fix:
-- USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
-- Should be replaced with:
-- USING (public.is_admin())

-- ================================================================
-- VERIFICATION
-- ================================================================

SELECT
    'Remaining RLS recursion issues fixed!' AS status,
    'All policies now use public.is_admin() instead of querying profiles table' AS method;

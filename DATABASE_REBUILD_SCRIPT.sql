-- ================================================================
-- COMPREHENSIVE DATABASE REBUILD SCRIPT
-- Run this in Supabase Dashboard SQL Editor
-- URL: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/sql/new
-- ================================================================

-- This script rebuilds all missing tables, functions, and triggers
-- It's safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)

-- ================================================================
-- PART 1: Initial Schema (Base Tables)
-- ================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create booking_status ENUM type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE public.booking_status AS ENUM (
      'pending_payment',
      'payment_processing',
      'payment_confirmed',
      'payment_failed',
      'scheduled',
      'rescheduled',
      'in_progress',
      'completed',
      'cancelled',
      'no_show'
    );
  END IF;
END
$$;

-- Create recurring_plans table
CREATE TABLE IF NOT EXISTS public.recurring_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  discount_percentage DECIMAL(5, 2),
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.profiles(id) NOT NULL,
  technician_id UUID REFERENCES public.profiles(id),
  service_id UUID REFERENCES public.services(id) NOT NULL,
  recurring_plan_id UUID REFERENCES public.recurring_plans(id),
  status public.booking_status DEFAULT 'pending_payment',
  price DECIMAL(10, 2) NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  area_type TEXT,
  property_size TEXT,
  notes TEXT,
  report_notes TEXT,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) NOT NULL,
  technician_id UUID REFERENCES public.profiles(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.profiles(id) NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_last4 TEXT,
  card_brand TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN (
    'booking_created',
    'booking_updated',
    'booking_cancelled',
    'booking_completed',
    'review_received',
    'payment_processed',
    'message'
  )) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create booking_images table
CREATE TABLE IF NOT EXISTS public.booking_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT CHECK (type IN ('before', 'after')) NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PART 2: Stripe Tables
-- ================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  stripe_payment_id TEXT UNIQUE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd' NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT CHECK (status IN (
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
  )) NOT NULL,
  price_id TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  amount_due NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2),
  currency TEXT DEFAULT 'usd' NOT NULL,
  status TEXT CHECK (status IN (
    'draft',
    'open',
    'paid',
    'uncollectible',
    'void'
  )) NOT NULL,
  invoice_pdf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PART 3: Triggers & Functions
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_services_modtime ON public.services;
CREATE TRIGGER update_services_modtime
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_recurring_plans_modtime ON public.recurring_plans;
CREATE TRIGGER update_recurring_plans_modtime
BEFORE UPDATE ON public.recurring_plans
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_bookings_modtime ON public.bookings;
CREATE TRIGGER update_bookings_modtime
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_customers_modtime ON public.customers;
CREATE TRIGGER update_customers_modtime
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_subscriptions_modtime ON public.subscriptions;
CREATE TRIGGER update_subscriptions_modtime
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Function to create profile after user signup
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
DECLARE
  role_val text;
BEGIN
  role_val := NEW.raw_user_meta_data->>'role';
  IF role_val IS NULL OR role_val = '' THEN
    role_val := 'customer';
  END IF;

  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, role_val)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;
CREATE TRIGGER create_profile_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_user();

-- ================================================================
-- PART 4: Notification Functions
-- ================================================================

-- Safe notification creation function
CREATE OR REPLACE FUNCTION public.create_safe_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create notification: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- Notification trigger for booking status changes
CREATE OR REPLACE FUNCTION public.notify_on_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.create_safe_notification(
      NEW.customer_id,
      'booking_updated',
      'Booking Status Updated',
      'Your booking status changed to: ' || NEW.status,
      jsonb_build_object(
        'booking_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

DROP TRIGGER IF EXISTS notify_status_change ON public.bookings;
CREATE TRIGGER notify_status_change
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_on_booking_status_change();

-- ================================================================
-- PART 5: Booking Management Functions
-- ================================================================

-- Update booking status function
CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_report_notes TEXT DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_old_status TEXT;
  v_customer_id UUID;
  v_result jsonb;
BEGIN
  -- Get current status and customer
  SELECT status, customer_id INTO v_old_status, v_customer_id
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Update booking
  UPDATE public.bookings
  SET
    status = p_new_status::public.booking_status,
    report_notes = COALESCE(p_report_notes, report_notes)
  WHERE id = p_booking_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'old_status', v_old_status,
    'new_status', p_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- Assign technician to booking
CREATE OR REPLACE FUNCTION public.assign_booking_technician(
  p_booking_id UUID,
  p_technician_id UUID
) RETURNS jsonb AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Get customer ID
  SELECT customer_id INTO v_customer_id
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Assign technician
  UPDATE public.bookings
  SET technician_id = p_technician_id
  WHERE id = p_booking_id;

  -- Create notification
  PERFORM public.create_safe_notification(
    v_customer_id,
    'booking_updated',
    'Technician Assigned',
    'A technician has been assigned to your booking',
    jsonb_build_object('booking_id', p_booking_id, 'technician_id', p_technician_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- ================================================================
-- PART 6: Performance Indexes
-- ================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_technician_id ON public.bookings(technician_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON public.bookings(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_technician_date ON public.bookings(technician_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON public.bookings(status, scheduled_date);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_technician_id ON public.reviews(technician_id);

-- Payment methods indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_customer ON public.payment_methods(customer_id, is_default);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON public.notifications(user_id, is_read);

-- Booking images indexes
CREATE INDEX IF NOT EXISTS idx_booking_images_booking_id ON public.booking_images(booking_id);

-- Stripe tables indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_id ON public.customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON public.payments(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);

-- ================================================================
-- PART 7: Sample Data (Optional - Run if needed)
-- ================================================================

-- Insert sample services if they don't exist
INSERT INTO public.services (name, description, base_price, duration_minutes, is_active)
SELECT * FROM (VALUES
  ('Basic Lawn Mowing', 'Standard lawn mowing service for residential yards.', 45.00, 60, true),
  ('Premium Lawn Care', 'Complete lawn care including mowing, edging, and cleanup.', 75.00, 90, true),
  ('Garden Maintenance', 'Weeding, pruning, and general garden upkeep.', 60.00, 75, true)
) AS new_services(name, description, base_price, duration_minutes, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.services WHERE name = new_services.name
);

-- Insert sample recurring plans if they don't exist
INSERT INTO public.recurring_plans (name, description, frequency, discount_percentage)
SELECT * FROM (VALUES
  ('Weekly Service', 'Service performed every week.', 'weekly', 10.00),
  ('Biweekly Service', 'Service performed every two weeks.', 'biweekly', 5.00),
  ('Monthly Service', 'Service performed once a month.', 'monthly', 0.00)
) AS new_plans(name, description, frequency, discount_percentage)
WHERE NOT EXISTS (
  SELECT 1 FROM public.recurring_plans WHERE name = new_plans.name
);

-- ================================================================
-- Rebuild Complete!
-- ================================================================

SELECT 'Database rebuild script completed successfully!' AS status;

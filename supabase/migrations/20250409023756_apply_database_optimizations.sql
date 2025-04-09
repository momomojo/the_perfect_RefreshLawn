-- Migration: Apply Database Optimizations
-- Description: Applies all database optimizations in a single migration

--------------------------------------------------
-- Single Column Indexes
--------------------------------------------------
-- Bookings table indexes
-- 1. Add index for customer_id (highly used in queries)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);

-- 2. Add index for technician_id (used for technician dashboards)
CREATE INDEX IF NOT EXISTS idx_bookings_technician_id ON bookings(technician_id);

-- 3. Add index for service_id (used for service analytics)
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);

-- 4. Add index for status (heavily used in filtering)
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 5. Add index for scheduled_date (used for date-based queries)
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduled_date);

-- Profiles table indexes
-- 6. Add index for role (used to filter customers/technicians)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

--------------------------------------------------
-- Composite Indexes
--------------------------------------------------
-- 1. Add composite index for customer_id + status (customer's bookings by status)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON bookings(customer_id, status);

-- 2. Add composite index for technician_id + scheduled_date (technician schedule)
CREATE INDEX IF NOT EXISTS idx_bookings_tech_date ON bookings(technician_id, scheduled_date);

--------------------------------------------------
-- Add Stripe-related Fields
--------------------------------------------------
-- Add stripe_product_id column if it doesn't exist
DO $$ 
BEGIN 
    -- Add stripe_product_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'stripe_product_id'
    ) THEN
        ALTER TABLE services ADD COLUMN stripe_product_id text;
    END IF;

    -- Add stripe_price_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'stripe_price_id'
    ) THEN
        ALTER TABLE services ADD COLUMN stripe_price_id text;
    END IF;
END $$;

--------------------------------------------------
-- Add Constraints
--------------------------------------------------
-- 1. Add status value constraint as NOT VALID (initial addition without validation)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'valid_status_values'
    ) THEN
        ALTER TABLE bookings ADD CONSTRAINT valid_status_values
            CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')) NOT VALID;
    END IF;
END $$;

-- 2. Add unique constraint for non-null stripe_customer_id
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'unique_stripe_customer_id'
    ) THEN
        -- First, create a partial index to ensure uniqueness of non-null values
        CREATE UNIQUE INDEX IF NOT EXISTS unique_stripe_customer_id_idx 
        ON profiles(stripe_customer_id) 
        WHERE stripe_customer_id IS NOT NULL;
    END IF;
END $$;

--------------------------------------------------
-- Create Dashboard Metrics Function
--------------------------------------------------
-- Create or replace the function
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS json AS $$
DECLARE
  total_bookings_count integer;
  completed_bookings_count integer;
  total_revenue numeric;
  customer_count integer;
  avg_rating numeric;
BEGIN
  -- Get total bookings count
  SELECT COUNT(*) INTO total_bookings_count FROM bookings;
  
  -- Get completed bookings count
  SELECT COUNT(*) INTO completed_bookings_count FROM bookings WHERE status = 'completed';
  
  -- Get total revenue
  SELECT COALESCE(SUM(price), 0) INTO total_revenue FROM bookings WHERE status = 'completed';
  
  -- Get customer count
  SELECT COUNT(*) INTO customer_count FROM profiles WHERE role = 'customer';
  
  -- Get average rating
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating FROM reviews;
  
  RETURN json_build_object(
    'totalBookings', total_bookings_count,
    'completedBookings', completed_bookings_count,
    'totalRevenue', total_revenue,
    'customerCount', customer_count,
    'averageRating', avg_rating
  );
END;
$$ LANGUAGE plpgsql;

-- Migration: Add Single Column Indexes
-- Description: Adds indexes for frequently queried fields to improve query performance

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
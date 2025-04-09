-- Add indexes incrementally with testing between each addition

-- Bookings table indexes
-- 1. Add index for customer_id (highly used in queries)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
-- After adding this index, run benchmark query 1 to measure improvement

-- 2. Add index for technician_id (used for technician dashboards)
CREATE INDEX IF NOT EXISTS idx_bookings_technician_id ON bookings(technician_id);
-- After adding this index, run benchmark query 2 to measure improvement

-- 3. Add index for service_id (used for service analytics)
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
-- Test queries that filter by service_id

-- 4. Add index for status (heavily used in filtering)
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
-- After adding this index, run benchmark query 3 to measure improvement

-- 5. Add index for scheduled_date (used for date-based queries)
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduled_date);
-- Test date-based queries

-- Profiles table indexes
-- 6. Add index for role (used to filter customers/technicians)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
-- After adding this index, run benchmark query 4 to measure improvement

-- Composite indexes for common query patterns
-- 7. Add composite index for customer_id + status (customer's bookings by status)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON bookings(customer_id, status);
-- Test queries that filter by both customer_id and status

-- 8. Add composite index for technician_id + scheduled_date (technician schedule)
CREATE INDEX IF NOT EXISTS idx_bookings_tech_date ON bookings(technician_id, scheduled_date);
-- After adding this index, run benchmark query 5 to measure improvement 
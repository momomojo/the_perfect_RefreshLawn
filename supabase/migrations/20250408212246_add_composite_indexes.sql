-- Migration: Add Composite Indexes
-- Description: Adds composite indexes for common query patterns to improve performance for specific queries

-- 1. Add composite index for customer_id + status (customer's bookings by status)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON bookings(customer_id, status);

-- 2. Add composite index for technician_id + scheduled_date (technician schedule)
CREATE INDEX IF NOT EXISTS idx_bookings_tech_date ON bookings(technician_id, scheduled_date); 
-- Migration: 20250616000200_update_booking_status_enum.sql
-- Add 'paid' as a valid status value for bookings.status

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS valid_status_values;

ALTER TABLE public.bookings
  ADD CONSTRAINT valid_status_values CHECK (
    status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'paid')
  );

-- Optionally update documentation or comments if needed
-- COMMENT ON COLUMN public.bookings.status IS 'Booking status: pending, scheduled, in_progress, completed, cancelled, paid';

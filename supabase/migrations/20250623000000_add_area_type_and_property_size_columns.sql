-- Migration: Add property_size and area_type to bookings table
-- Timestamp: 20250623000000

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS property_size TEXT,
  ADD COLUMN IF NOT EXISTS area_type TEXT;

COMMENT ON COLUMN public.bookings.property_size IS 'Optional property size metadata provided by technician during booking creation';
COMMENT ON COLUMN public.bookings.area_type IS 'Optional area type metadata provided by technician during booking creation'; 
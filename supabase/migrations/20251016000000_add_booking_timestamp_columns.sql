-- Migration: Add missing timestamp columns to bookings table
-- Description: The update_booking_status function references started_at, completed_at,
--              and cancelled_at columns that were never created. This migration adds them.

-- Add the missing timestamp columns
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.bookings.started_at IS 'Timestamp when the booking status was changed to in_progress';
COMMENT ON COLUMN public.bookings.completed_at IS 'Timestamp when the booking was completed';
COMMENT ON COLUMN public.bookings.cancelled_at IS 'Timestamp when the booking was cancelled';

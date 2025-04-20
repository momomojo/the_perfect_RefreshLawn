-- Migration: Add 'rescheduled' to booking_status enum
-- Description: Adds the 'rescheduled' value to the public.booking_status enum type to allow bookings to be marked as rescheduled.

ALTER TYPE public.booking_status ADD VALUE 'rescheduled';

COMMENT ON TYPE public.booking_status IS 'Enum defining the possible statuses for a booking, now including rescheduled.';

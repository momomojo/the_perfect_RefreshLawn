-- Migration to remove the old function signature causing ambiguity
DROP FUNCTION IF EXISTS public.update_booking_status(uuid, public.booking_status, uuid);

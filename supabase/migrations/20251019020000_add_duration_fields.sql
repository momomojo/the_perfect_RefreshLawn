-- Add duration tracking to services and bookings tables
-- This enables technicians to define how long each service takes
-- and allows custom duration overrides per booking (e.g., adding travel time)

-- Add default_duration_minutes to services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS default_duration_minutes integer DEFAULT 60 NOT NULL;

COMMENT ON COLUMN public.services.default_duration_minutes IS 'Default duration in minutes for this service (used as starting point for bookings)';

-- Add duration tracking fields to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS duration_minutes integer,
ADD COLUMN IF NOT EXISTS ends_at timestamptz;

COMMENT ON COLUMN public.bookings.duration_minutes IS 'Actual duration in minutes for this booking (defaults to service duration, but can be overridden for travel time, etc.)';
COMMENT ON COLUMN public.bookings.ends_at IS 'Calculated end time of the booking (scheduled_date + scheduled_time + duration_minutes)';

-- Create function to calculate and set ends_at based on scheduled datetime and duration
CREATE OR REPLACE FUNCTION public.calculate_booking_ends_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_datetime timestamptz;
BEGIN
  -- Only calculate if we have all required fields
  IF NEW.scheduled_date IS NOT NULL
     AND NEW.scheduled_time IS NOT NULL
     AND NEW.duration_minutes IS NOT NULL THEN

    -- Combine date and time into a single timestamp
    v_start_datetime := (NEW.scheduled_date || ' ' || NEW.scheduled_time)::timestamptz;

    -- Calculate end time by adding duration
    NEW.ends_at := v_start_datetime + (NEW.duration_minutes || ' minutes')::interval;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_booking_ends_at IS 'Automatically calculates and sets the ends_at timestamp based on scheduled datetime and duration';

-- Create trigger to auto-calculate ends_at on insert and update
CREATE TRIGGER calculate_booking_ends_at_trigger
  BEFORE INSERT OR UPDATE OF scheduled_date, scheduled_time, duration_minutes
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_booking_ends_at();

-- Create function to auto-populate duration_minutes from service default if not provided
CREATE OR REPLACE FUNCTION public.set_booking_duration_from_service()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_duration integer;
BEGIN
  -- If duration_minutes is not provided, get it from the service
  IF NEW.duration_minutes IS NULL AND NEW.service_id IS NOT NULL THEN
    SELECT default_duration_minutes
    INTO v_service_duration
    FROM public.services
    WHERE id = NEW.service_id;

    NEW.duration_minutes := v_service_duration;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_booking_duration_from_service IS 'Automatically sets duration_minutes from service default if not explicitly provided';

-- Create trigger to auto-set duration from service (runs before ends_at calculation)
CREATE TRIGGER set_booking_duration_from_service_trigger
  BEFORE INSERT OR UPDATE OF service_id, duration_minutes
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_duration_from_service();

-- Backfill existing bookings with service duration
-- This safely handles existing bookings by setting their duration from the service
DO $$
DECLARE
  v_updated_count integer;
BEGIN
  -- Update bookings that don't have duration_minutes set
  WITH updated AS (
    UPDATE public.bookings b
    SET duration_minutes = s.default_duration_minutes
    FROM public.services s
    WHERE b.service_id = s.id
      AND b.duration_minutes IS NULL
    RETURNING b.id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;

  RAISE NOTICE 'Backfilled duration_minutes for % existing bookings', v_updated_count;

  -- Update ends_at for bookings that now have all required fields
  WITH updated_ends AS (
    UPDATE public.bookings
    SET ends_at = (
      (scheduled_date || ' ' || scheduled_time)::timestamptz +
      (duration_minutes || ' minutes')::interval
    )
    WHERE scheduled_date IS NOT NULL
      AND scheduled_time IS NOT NULL
      AND duration_minutes IS NOT NULL
      AND ends_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated_ends;

  RAISE NOTICE 'Calculated ends_at for % existing bookings', v_updated_count;
END $$;

-- Add index for efficient queries on ends_at (useful for finding conflicting bookings)
CREATE INDEX IF NOT EXISTS idx_bookings_ends_at ON public.bookings(ends_at);

-- Add composite index for technician + time range queries (critical for availability checking)
CREATE INDEX IF NOT EXISTS idx_bookings_technician_time_range
  ON public.bookings(technician_id, scheduled_date, scheduled_time, ends_at)
  WHERE technician_id IS NOT NULL;

-- Update some example service durations (you can adjust these as needed)
UPDATE public.services SET default_duration_minutes = 60 WHERE name ILIKE '%mow%';
UPDATE public.services SET default_duration_minutes = 90 WHERE name ILIKE '%trim%';
UPDATE public.services SET default_duration_minutes = 120 WHERE name ILIKE '%cleanup%';
UPDATE public.services SET default_duration_minutes = 45 WHERE name ILIKE '%edge%';

-- Note: All other services will keep the default 60 minutes

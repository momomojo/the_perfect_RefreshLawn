-- Migration: Fix notification trigger type casting issue
-- Description: Resolves PostgreSQL function signature mismatch by using explicit variable declaration
--              instead of inline subqueries that result in "unknown" type
-- Related Issue: function public.create_notification_safe(uuid, unknown, unknown, text, jsonb) does not exist
-- Test: Cash payment booking creation
-- Date: 2025-10-16

-- Drop and recreate the notify_on_booking_change function with proper type handling
CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_service_name TEXT;
  v_message TEXT;
BEGIN
  ---------------------------------------------------------------------------
  -- INSERT (new booking)
  ---------------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    -- Get service name explicitly to avoid type casting issues
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

    -- Handle case where service might not be found
    IF v_service_name IS NULL THEN
      v_service_name := 'Unknown Service';
    END IF;

    -- Build message with known TEXT type
    v_message := 'Your booking for ' || v_service_name || ' has been created.';

    -- Customer notification
    PERFORM public.create_notification_safe(
      NEW.customer_id,
      'booking_created'::TEXT,
      'New Booking Created'::TEXT,
      v_message,
      jsonb_build_object('booking_id', NEW.id, 'service_id', NEW.service_id)
    );

    -- Admin notifications - iterate over all admins and send each a notification
    PERFORM public.create_notification_safe(
      id,
      'booking_created'::TEXT,
      'New Booking Received'::TEXT,
      'A new booking has been created by a customer.'::TEXT,
      jsonb_build_object('booking_id', NEW.id, 'customer_id', NEW.customer_id)
    ) FROM public.profiles WHERE role = 'admin';

  ---------------------------------------------------------------------------
  -- UPDATE (status changes)
  ---------------------------------------------------------------------------
  ELSIF TG_OP = 'UPDATE' THEN
    -- Scheduled from pending
    IF NEW.status = 'scheduled' AND OLD.status = 'pending' THEN
      v_message := 'Your booking has been scheduled for ' || NEW.scheduled_date::TEXT || ' at ' || NEW.scheduled_time::TEXT;

      PERFORM public.create_notification_safe(
        NEW.customer_id,
        'booking_updated'::TEXT,
        'Booking Scheduled'::TEXT,
        v_message,
        jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
      );

      IF NEW.technician_id IS NOT NULL THEN
        v_message := 'You have been assigned a new job on ' || NEW.scheduled_date::TEXT;

        PERFORM public.create_notification_safe(
          NEW.technician_id,
          'booking_updated'::TEXT,
          'New Job Assigned'::TEXT,
          v_message,
          jsonb_build_object('booking_id', NEW.id, 'customer_id', NEW.customer_id)
        );
      END IF;

    -- Completed from in_progress
    ELSIF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
      PERFORM public.create_notification_safe(
        NEW.customer_id,
        'booking_updated'::TEXT,
        'Service Completed'::TEXT,
        'Your service has been completed. Please leave a review!'::TEXT,
        jsonb_build_object('booking_id', NEW.id)
      );

    -- Cancelled
    ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      PERFORM public.create_notification_safe(
        NEW.customer_id,
        'booking_cancelled'::TEXT,
        'Booking Cancelled'::TEXT,
        'Your booking has been cancelled.'::TEXT,
        jsonb_build_object('booking_id', NEW.id)
      );

      IF NEW.technician_id IS NOT NULL THEN
        PERFORM public.create_notification_safe(
          NEW.technician_id,
          'booking_cancelled'::TEXT,
          'Job Cancelled'::TEXT,
          'A job assigned to you has been cancelled.'::TEXT,
          jsonb_build_object('booking_id', NEW.id)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update function comment
COMMENT ON FUNCTION public.notify_on_booking_change() IS 'Trigger function to send notifications based on booking inserts or status updates. Uses explicit type casting to avoid PostgreSQL function signature mismatch errors.';

-- Verify the trigger is still attached (should already exist from previous migrations)
-- If for some reason it was dropped, recreate it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'booking_change_notification'
    AND tgrelid = 'public.bookings'::regclass
  ) THEN
    CREATE TRIGGER booking_change_notification
      AFTER INSERT OR UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_on_booking_change();

    RAISE NOTICE 'Recreated trigger booking_change_notification on bookings table';
  ELSE
    RAISE NOTICE 'Trigger booking_change_notification already exists - no action needed';
  END IF;
END $$;

-- Migration: Correct update_booking_status implementation and admin notification logic
-- Description: 
--   1. Fixes BOOLEAN/INTEGER mismatch inside update_booking_status by tracking affected rows in an INTEGER
--      variable and casting the result to BOOLEAN.
--   2. Fixes the notify_on_booking_change trigger function so that it notifies *each* admin correctly
--      (reference the profile table's id column instead of the non‑existent admin_id variable).
--
-- NOTE: This migration is idempotent – it uses CREATE OR REPLACE so it can be safely re‑run.

-----------------------------
-- 1. update_booking_status --
-----------------------------

CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id uuid,
  p_new_status public.booking_status,
  p_user_id uuid DEFAULT NULL::uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking            public.bookings%ROWTYPE;
  v_current_status     public.booking_status;
  v_customer_id        uuid;
  v_technician_id      uuid;
  v_user_role          text;
  v_notification_title text;
  v_notification_msg   text;
  v_rows_affected      integer; -- track affected rows as INTEGER
BEGIN
  -- Make sure booking exists
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found with ID: %', p_booking_id;
  END IF;

  v_current_status := v_booking.status;
  v_customer_id    := v_booking.customer_id;
  v_technician_id  := v_booking.technician_id;

  -- No‑op if status already matches
  IF p_new_status = v_current_status THEN
    RETURN FALSE;
  END IF;

  -- Prevent changing a cancelled booking to anything else
  IF v_current_status = 'cancelled' AND p_new_status <> 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change a cancelled booking to %', p_new_status;
  END IF;

  -- -----------------------------------------------------------------------
  --  ROLE‑BASED PERMISSION CHECKS
  -- -----------------------------------------------------------------------
  IF p_user_id IS NOT NULL THEN
    SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;

    IF v_user_role = 'admin' THEN
      NULL; -- admins can do anything

    ELSIF v_user_role = 'technician' AND v_technician_id = p_user_id THEN
      IF p_new_status NOT IN ('in_progress', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Technicians can only set status to in_progress, completed or cancelled';
      END IF;

    ELSIF v_user_role = 'customer' AND v_customer_id = p_user_id THEN
      IF p_new_status <> 'cancelled' THEN
        RAISE EXCEPTION 'Customers can only cancel their bookings';
      END IF;

    ELSE
      RAISE EXCEPTION 'You do not have permission to update this booking';
    END IF;
  END IF;

  -- -----------------------------------------------------------------------
  --  UPDATE BOOKING
  -- -----------------------------------------------------------------------
  UPDATE public.bookings
  SET status     = p_new_status,
      updated_at = timezone('utc', now())
  WHERE id = p_booking_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- -----------------------------------------------------------------------
  --  NOTIFICATIONS (wrapped in BEGIN .. EXCEPTION so a notification failure
  --  never rolls back the status update)
  -- -----------------------------------------------------------------------
  BEGIN
    v_notification_title := 'Booking Status Updated';
    v_notification_msg   := 'The status of your booking (ID: ' || left(p_booking_id::text, 8) || ') has been updated to ' || p_new_status || '.';

    IF v_customer_id IS NOT NULL THEN
      PERFORM public.create_notification_safe(
        v_customer_id,
        'booking_updated',
        v_notification_title,
        v_notification_msg,
        jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
      );
    END IF;

    IF v_technician_id IS NOT NULL AND p_new_status IN ('in_progress', 'completed', 'cancelled', 'rescheduled') THEN
      PERFORM public.create_notification_safe(
        v_technician_id,
        'booking_updated',
        v_notification_title,
        'The status of your assigned booking (ID: ' || left(p_booking_id::text, 8) || ') is now ' || p_new_status || '.',
        jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification creation failed in update_booking_status: %', SQLERRM;
  END;

  RETURN v_rows_affected > 0;
END;
$function$;

COMMENT ON FUNCTION public.update_booking_status(uuid, public.booking_status, uuid)
  IS 'Updates booking status with role‑based permissions and returns TRUE if at least one row was affected.';

-------------------------------------------
-- 2. notify_on_booking_change (trigger) --
-------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_on_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  ---------------------------------------------------------------------------
  -- INSERT  (new booking)
  ---------------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    -- customer
    PERFORM create_notification(
      NEW.customer_id,
      'booking_created',
      'New Booking Created',
      'Your booking for ' || (SELECT name FROM services WHERE id = NEW.service_id) || ' has been created.',
      jsonb_build_object('booking_id', NEW.id, 'service_id', NEW.service_id)
    );

    -- admins – iterate over all admins and send each a notification
    PERFORM create_notification(
      id,
      'booking_created',
      'New Booking Received',
      'A new booking has been created by a customer.',
      jsonb_build_object('booking_id', NEW.id, 'customer_id', NEW.customer_id)
    ) FROM profiles WHERE role = 'admin';

  ---------------------------------------------------------------------------
  -- UPDATE (status changes)
  ---------------------------------------------------------------------------
  ELSIF TG_OP = 'UPDATE' THEN
    -- scheduled from pending
    IF NEW.status = 'scheduled' AND OLD.status = 'pending' THEN
      PERFORM create_notification(
        NEW.customer_id,
        'booking_updated',
        'Booking Scheduled',
        'Your booking has been scheduled for ' || NEW.scheduled_date || ' at ' || NEW.scheduled_time,
        jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
      );

      IF NEW.technician_id IS NOT NULL THEN
        PERFORM create_notification(
          NEW.technician_id,
          'booking_updated',
          'New Job Assigned',
          'You have been assigned a new job on ' || NEW.scheduled_date,
          jsonb_build_object('booking_id', NEW.id, 'customer_id', NEW.customer_id)
        );
      END IF;

    -- completed from in_progress
    ELSIF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
      PERFORM create_notification(
        NEW.customer_id,
        'booking_updated',
        'Service Completed',
        'Your service has been completed. Please leave a review!',
        jsonb_build_object('booking_id', NEW.id)
      );

    -- cancelled
    ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      PERFORM create_notification(
        NEW.customer_id,
        'booking_cancelled',
        'Booking Cancelled',
        'Your booking has been cancelled.',
        jsonb_build_object('booking_id', NEW.id)
      );

      IF NEW.technician_id IS NOT NULL THEN
        PERFORM create_notification(
          NEW.technician_id,
          'booking_cancelled',
          'Job Cancelled',
          'A job assigned to you has been cancelled.',
          jsonb_build_object('booking_id', NEW.id)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.notify_on_booking_change()
  IS 'Trigger function that automatically creates notifications for booking status changes (fixed admin reference).';

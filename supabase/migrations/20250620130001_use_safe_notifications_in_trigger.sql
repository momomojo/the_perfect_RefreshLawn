-- Migration: Update notify_on_booking_change trigger function to use safe notification wrapper
-- Description: Replaces calls to create_notification with public.create_notification_safe within the notify_on_booking_change function to enhance error handling and prevent transaction rollbacks.

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
    PERFORM public.create_notification_safe(  -- <<< Changed
      NEW.customer_id,
      'booking_created',
      'New Booking Created',
      'Your booking for ' || (SELECT name FROM services WHERE id = NEW.service_id) || ' has been created.',
      jsonb_build_object('booking_id', NEW.id, 'service_id', NEW.service_id)
    );

    -- admins – iterate over all admins and send each a notification
    PERFORM public.create_notification_safe(  -- <<< Changed
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
      PERFORM public.create_notification_safe(  -- <<< Changed
        NEW.customer_id,
        'booking_updated',
        'Booking Scheduled',
        'Your booking has been scheduled for ' || NEW.scheduled_date || ' at ' || NEW.scheduled_time,
        jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
      );

      IF NEW.technician_id IS NOT NULL THEN
        PERFORM public.create_notification_safe(  -- <<< Changed
          NEW.technician_id,
          'booking_updated',
          'New Job Assigned',
          'You have been assigned a new job on ' || NEW.scheduled_date,
          jsonb_build_object('booking_id', NEW.id, 'customer_id', NEW.customer_id)
        );
      END IF;

    -- completed from in_progress
    ELSIF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
      PERFORM public.create_notification_safe(  -- <<< Changed
        NEW.customer_id,
        'booking_updated',
        'Service Completed',
        'Your service has been completed. Please leave a review!',
        jsonb_build_object('booking_id', NEW.id)
      );

    -- cancelled
    ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      PERFORM public.create_notification_safe(  -- <<< Changed
        NEW.customer_id,
        'booking_cancelled',
        'Booking Cancelled',
        'Your booking has been cancelled.',
        jsonb_build_object('booking_id', NEW.id)
      );

      IF NEW.technician_id IS NOT NULL THEN
        PERFORM public.create_notification_safe(  -- <<< Changed
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

COMMENT ON FUNCTION public.notify_on_booking_change() IS 'Trigger function to send notifications based on booking inserts or status updates, using create_notification_safe.';

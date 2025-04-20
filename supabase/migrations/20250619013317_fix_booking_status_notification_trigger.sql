-- Migration: Fix booking status notification trigger
-- Description: Updates the create_booking_status_notification function to correctly use the 5-parameter create_notification signature

CREATE OR REPLACE FUNCTION public.create_booking_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  notification_needed BOOLEAN := FALSE;
  notification_title TEXT;
  notification_body TEXT;
  notification_type TEXT;
  notification_priority TEXT := 'normal';
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Determine if this status change should trigger a notification
    CASE NEW.status
      WHEN 'payment_confirmed' THEN
        notification_needed := TRUE;
        notification_title := 'Payment Confirmed';
        notification_body := 'Your payment has been confirmed for booking #' || NEW.id;
        notification_type := 'payment_confirmation';
      WHEN 'scheduled' THEN
        notification_needed := TRUE;
        notification_title := 'Booking Scheduled';
        notification_body := 'Your service has been scheduled for ' || to_char(NEW.scheduled_date, 'Mon DD, YYYY');
        notification_type := 'booking_scheduled';
      WHEN 'in_progress' THEN
        notification_needed := TRUE;
        notification_title := 'Service In Progress';
        notification_body := 'Your service is now in progress';
        notification_type := 'service_update';
      WHEN 'completed' THEN
        notification_needed := TRUE;
        notification_title := 'Service Completed';
        notification_body := 'Your service has been completed';
        notification_type := 'service_update';
        notification_priority := 'high';
      WHEN 'payment_failed' THEN
        notification_needed := TRUE;
        notification_title := 'Payment Failed';
        notification_body := 'There was an issue with your payment for booking #' || NEW.id;
        notification_type := 'payment_issue';
        notification_priority := 'high';
      WHEN 'cancelled' THEN
        notification_needed := TRUE;
        notification_title := 'Booking Cancelled';
        notification_body := 'Your booking has been cancelled';
        notification_type := 'booking_update';
      ELSE
        notification_needed := FALSE;
    END CASE;
    
    -- Create the notification if needed, including priority in the data object instead
    IF notification_needed AND NEW.customer_id IS NOT NULL THEN
      PERFORM public.create_notification_safe(
        NEW.customer_id,  -- user_id
        notification_type,  -- notification type
        notification_title,  -- title
        notification_body,  -- message
        jsonb_build_object(  -- data
          'booking_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'priority', notification_priority  -- include priority in the data JSON
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.create_booking_status_notification() IS 'Trigger function that creates notifications when booking status changes, with priority included in data JSON'; 
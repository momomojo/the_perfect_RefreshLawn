-- Migration: Fix notify_status_change trigger function
-- Description: Updates the notify_status_change function to correctly use the 5-parameter create_notification signature

CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_message TEXT;
  v_title TEXT;
  v_type TEXT;
  v_priority TEXT := 'normal';
  v_data JSONB := '{}'::jsonb;
  v_notify BOOLEAN := TRUE; -- Flag to determine if we should create a notification
BEGIN
  -- Set notification details based on new status
  CASE NEW.status::TEXT
    WHEN 'pending_payment' THEN
      v_title := 'Booking Created';
      v_message := 'Your booking is awaiting payment.';
      v_type := 'booking_created';
      -- For pending_payment, only notify if it's a new booking
      v_notify := (OLD.status IS NULL OR OLD.id IS NULL);
      
    WHEN 'payment_processing' THEN
      v_title := 'Payment Processing';
      v_message := 'Your payment is being processed.';
      v_type := 'payment_processing';
      -- Don't send a notification for this intermediate state
      v_notify := FALSE;
      
    WHEN 'payment_confirmed' THEN
      v_title := 'Payment Confirmed';
      v_message := 'Your payment has been confirmed.';
      v_type := 'payment_confirmed';
      v_priority := 'high';
      
    WHEN 'scheduled' THEN
      v_title := 'Booking Scheduled';
      v_message := 'Your booking has been scheduled.';
      v_type := 'booking_scheduled';
      
    WHEN 'in_progress' THEN
      v_title := 'Service In Progress';
      v_message := 'Your service is now in progress.';
      v_type := 'service_in_progress';
      
    WHEN 'completed' THEN
      v_title := 'Service Completed';
      v_message := 'Your service has been completed.';
      v_type := 'service_completed';
      v_priority := 'high';
      
    WHEN 'payment_failed' THEN
      v_title := 'Payment Failed';
      v_message := 'There was an issue with your payment.';
      v_type := 'payment_failed';
      v_priority := 'urgent';
      
    WHEN 'cancelled' THEN
      v_title := 'Booking Cancelled';
      v_message := 'Your booking has been cancelled.';
      v_type := 'booking_cancelled';
      
    WHEN 'rescheduled' THEN
      v_title := 'Booking Rescheduled';
      v_message := 'Your booking has been rescheduled.';
      v_type := 'booking_rescheduled';
      
    ELSE
      -- Default case (shouldn't happen with enum)
      v_title := 'Booking Update';
      v_message := 'Your booking status has been updated to ' || NEW.status::TEXT || '.';
      v_type := 'booking_updated';
  END CASE;
  
  -- Add booking metadata and priority to notification data
  v_data := jsonb_build_object(
    'booking_id', NEW.id,
    'old_status', COALESCE(OLD.status::TEXT, 'new'),
    'new_status', NEW.status::TEXT,
    'priority', v_priority  -- Include priority in the data JSON
  );
  
  -- Create notification if needed and customer exists
  IF v_notify = TRUE AND NEW.customer_id IS NOT NULL THEN
    BEGIN
      PERFORM public.create_notification_safe(
        NEW.customer_id,
        v_type,
        v_title,
        v_message,
        v_data
      );
    EXCEPTION WHEN OTHERS THEN
      -- Don't let notification failure stop the trigger
      RAISE WARNING 'Failed to create notification for booking status change: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.notify_status_change() IS 'Trigger function that creates notifications when booking status changes, with priority included in data JSON'; 
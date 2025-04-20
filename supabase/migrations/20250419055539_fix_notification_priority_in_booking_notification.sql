-- Migration: Fix default notification priority in booking status notifications
-- Description: Changes the default priority from 'medium' to 'normal' to satisfy the notifications_priority_check constraint

-- Update the function to use 'normal' as default priority
CREATE OR REPLACE FUNCTION public.create_booking_status_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  notification_needed BOOLEAN := FALSE;
  notification_title TEXT;
  notification_body TEXT;
  notification_type TEXT;
  notification_priority TEXT := 'normal';  -- changed from 'medium' to 'normal'
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
        notification_body := 'Your booking for ' || to_char(NEW.scheduled_date, 'Mon DD, YYYY') || ' has been cancelled';
        notification_type := 'booking_cancelled';
        notification_priority := 'high';
      ELSE
        notification_needed := FALSE;
    END CASE;

    IF notification_needed AND NEW.customer_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data,
        entity_id,
        entity_type,
        priority,
        expires_at
      ) VALUES (
        NEW.customer_id,
        notification_title,
        notification_body,
        notification_type,
        jsonb_build_object('booking_id', NEW.id),
        NEW.id,
        'booking',
        notification_priority,
        CURRENT_TIMESTAMP + INTERVAL '30 days'
      );

      -- Mark that notification was sent
      UPDATE public.bookings 
      SET notification_sent = TRUE 
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NULL;
END;
$function$; 
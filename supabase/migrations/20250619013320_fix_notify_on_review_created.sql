-- Migration: Fix notify_on_review_created function
-- Description: Updates the function to use create_notification_safe for better error handling

CREATE OR REPLACE FUNCTION public.notify_on_review_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $function$
DECLARE
  v_booking_id UUID;
  v_service_id UUID;
  v_data JSONB;
BEGIN
  -- Get the booking ID
  v_booking_id := NEW.booking_id;
  
  -- Get service ID from booking
  SELECT service_id INTO v_service_id FROM bookings WHERE id = v_booking_id;
  
  -- Create data for notification
  v_data := jsonb_build_object(
    'booking_id', v_booking_id,
    'review_id', NEW.id,
    'rating', NEW.rating
  );
  
  -- Notify the technician about the new review
  PERFORM create_notification_safe(
    NEW.technician_id,
    'review_received',
    'New Review Received',
    'You have received a new review for your service.',
    v_data
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't let notification failure stop the trigger
  RAISE WARNING 'Failed to create notification for review: %', SQLERRM;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.notify_on_review_created() IS 'Trigger function that creates a notification when a review is posted'; 
-- Migration: Expand notification types
-- Description: Updates the notification type check constraint to include more specific notification types

-- First, drop the existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the constraint with expanded types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
    'booking_created'::text, 
    'booking_updated'::text, 
    'booking_cancelled'::text, 
    'review_received'::text, 
    'payment_processed'::text, 
    'technician_assigned'::text, -- New more specific type
    'message'::text,
    'booking_scheduled'::text -- Ensure existing type is still allowed
]));

-- Update the assign_booking_technician function to use the new type
CREATE OR REPLACE FUNCTION public.assign_booking_technician(p_booking_id uuid, p_technician_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Validate technician exists and has the correct role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_technician_id AND role = 'technician'
  ) THEN
    RAISE EXCEPTION 'Invalid technician ID or user is not a technician.';
  END IF;

  -- Get customer ID for notification
  SELECT customer_id INTO v_customer_id FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
      RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Update booking with technician and set status to scheduled
  UPDATE public.bookings
  SET technician_id = p_technician_id,
      status = 'scheduled', -- Assume assigning means scheduling
      updated_at = timezone('utc', now())
  WHERE id = p_booking_id;

  -- Create Notifications
  BEGIN
      -- Notify the assigned technician
      PERFORM public.create_notification(
          p_user_id := p_technician_id,
          p_type := 'technician_assigned',  -- Use new, more specific type
          p_title := 'New Booking Assignment',
          p_message := 'You have been assigned a new booking (ID: ' || left(p_booking_id::text, 8) || ').',
          p_data := jsonb_build_object('booking_id', p_booking_id)
      );

      -- Notify the customer
      IF v_customer_id IS NOT NULL THEN
          PERFORM public.create_notification(
              p_user_id := v_customer_id,
              p_type := 'technician_assigned',  -- Use new, more specific type
              p_title := 'Technician Assigned',
              p_message := 'A technician has been assigned to your booking (ID: ' || left(p_booking_id::text, 8) || ').',
              p_data := jsonb_build_object('booking_id', p_booking_id, 'technician_id', p_technician_id)
          );
      END IF;

  EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create notification for technician assignment (%): %', p_booking_id, SQLERRM;
      -- Do not block the main operation if notification fails
  END;

END;
$function$;

-- Update the comment on the function
COMMENT ON FUNCTION public.assign_booking_technician IS 'Assigns a technician to a booking and creates notifications with the technician_assigned type';

-- Ensure the function has the right permissions
GRANT EXECUTE ON FUNCTION public.assign_booking_technician TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_booking_technician TO service_role; 
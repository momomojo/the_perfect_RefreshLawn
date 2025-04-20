-- Migration: Fix update_booking_status parameter names and add better role handling
-- This migration standardizes the update_booking_status function to use p_new_status
-- as the parameter name consistently across all code paths.

----------------------------------------------------------------------
-- Function: update_booking_status
----------------------------------------------------------------------
-- Drop the old function with both signatures to avoid conflicts 
DROP FUNCTION IF EXISTS public.update_booking_status(uuid, text);
DROP FUNCTION IF EXISTS public.update_booking_status(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.update_booking_status(p_booking_id uuid, p_new_status text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Empty search_path for security
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_current_status TEXT;
  v_customer_id UUID;
  v_technician_id UUID;
  v_user_role TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_notification_type TEXT := 'booking_updated';
  v_success BOOLEAN;
BEGIN
  -- Get current booking details
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found with ID: %', p_booking_id;
  END IF;
  
  -- Store current values
  v_current_status := v_booking.status;
  v_customer_id := v_booking.customer_id;
  v_technician_id := v_booking.technician_id;
  
  -- Skip update if status is not changing
  IF p_new_status = v_current_status THEN
    RETURN false;
  END IF;
  
  -- Basic status validation
  IF v_current_status = 'cancelled' AND p_new_status != 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change a cancelled booking to %', p_new_status;
  END IF;
  
  -- Role-based permission checking
  IF p_user_id IS NOT NULL THEN
    -- Get user role
    SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;
    
    IF v_user_role = 'admin' THEN
      -- Admins can update any booking to any status
      NULL; -- No restrictions
    ELSIF v_user_role = 'technician' AND v_technician_id = p_user_id THEN
      -- Technicians can only update their assigned bookings
      -- and can only set status to 'in_progress', 'completed' or 'cancelled'
      IF p_new_status NOT IN ('in_progress', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Technicians can only set status to in_progress, completed or cancelled';
      END IF;
    ELSIF v_user_role = 'customer' AND v_customer_id = p_user_id THEN
      -- Customers can only update their own bookings
      -- and can only set status to 'cancelled'
      IF p_new_status != 'cancelled' THEN
        RAISE EXCEPTION 'Customers can only cancel their bookings';
      END IF;
    ELSE
      RAISE EXCEPTION 'You do not have permission to update this booking';
    END IF;
  ELSE
    -- If no user ID provided, we assume this is a system update (e.g., from a scheduled job)
    -- or we're in a context where auth.uid() would be used, so we don't add extra restrictions
    NULL;
  END IF;
  
  -- Update the booking status
  UPDATE public.bookings
  SET 
    status = p_new_status,
    updated_at = timezone('utc', now())
  WHERE id = p_booking_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  
  -- Create Notification(s)
  BEGIN
    -- Determine who to notify and the message content
    v_notification_title := 'Booking Status Updated';
    v_notification_message := 'The status of your booking (ID: ' || left(p_booking_id::text, 8) || ') has been updated to ' || p_new_status || '.';
    v_notification_type := 'booking_updated';
    
    -- Notify customer (usually always)
    IF v_customer_id IS NOT NULL THEN
        PERFORM public.create_notification(
            p_user_id := v_customer_id,
            p_type := v_notification_type,
            p_title := v_notification_title,
            p_message := v_notification_message,
            p_data := jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
        );
    END IF;
    
    -- Notify technician if assigned and status changes to relevant states
    IF v_technician_id IS NOT NULL AND p_new_status IN ('in_progress', 'completed', 'cancelled', 'rescheduled') THEN
         PERFORM public.create_notification(
            p_user_id := v_technician_id,
            p_type := v_notification_type,
            p_title := v_notification_title,
            p_message := 'The status of your assigned booking (ID: ' || left(p_booking_id::text, 8) || ') is now ' || p_new_status || '.',
            p_data := jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
        );
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create notification for booking status update (%): %', p_booking_id, SQLERRM;
      -- Do not block the main operation if notification fails
  END;
  
  RETURN v_success > 0;
END;
$function$;

COMMENT ON FUNCTION public.update_booking_status(uuid, text, uuid) IS 'Updates booking status with role-based permissions and sends notifications to relevant users';

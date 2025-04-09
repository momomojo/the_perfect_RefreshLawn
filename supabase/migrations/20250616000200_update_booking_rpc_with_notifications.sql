-- Migration to update booking RPC functions with notification logic

-- Add notification creation to update_booking_status function
-- Using CREATE OR REPLACE for idempotency
CREATE OR REPLACE FUNCTION public.update_booking_status (
  p_booking_id UUID,
  p_new_status TEXT,
  p_user_id UUID -- User performing the action (can be null if system)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_customer_id UUID;
  v_technician_id UUID;
  v_is_allowed BOOLEAN := FALSE;
  v_notification_user_id UUID;
  v_notification_type TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Fetch booking details
  SELECT status, customer_id, technician_id
  INTO v_current_status, v_customer_id, v_technician_id
  FROM public.bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Permission Check (Example - adapt to your logic)
  -- Allow service_role, the customer, the assigned technician, or an admin
  IF (SELECT rolname FROM pg_roles WHERE oid = session_user::regrole) <> 'service_role' AND
     p_user_id IS NOT NULL AND
     NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id AND (
            role = 'admin' OR
            id = v_customer_id OR
            (v_technician_id IS NOT NULL AND id = v_technician_id)
        )
     ) THEN
       RAISE EXCEPTION 'Permission denied to update booking status.';
  END IF;

  -- Define allowed status transitions (Example logic)
  CASE v_current_status
    WHEN 'pending' THEN
      v_is_allowed := p_new_status IN ('scheduled', 'cancelled', 'payment_failed');
    WHEN 'scheduled' THEN
      v_is_allowed := p_new_status IN ('in_progress', 'cancelled', 'rescheduled');
    WHEN 'in_progress' THEN
      v_is_allowed := p_new_status IN ('completed', 'cancelled');
    WHEN 'completed' THEN
      v_is_allowed := FALSE; -- Or only allow admin
    WHEN 'cancelled' THEN
      v_is_allowed := FALSE;
    WHEN 'payment_failed' THEN
      v_is_allowed := p_new_status IN ('pending', 'cancelled');
    WHEN 'rescheduled' THEN
      v_is_allowed := p_new_status IN ('scheduled', 'cancelled');
    ELSE
      v_is_allowed := FALSE;
  END CASE;

  IF NOT v_is_allowed THEN
     -- Allow admin to bypass transition rules (Example)
     IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_new_status;
     END IF;
  END IF;

  -- Update the booking status
  UPDATE public.bookings
  SET status = p_new_status,
      updated_at = timezone('utc', now())
  WHERE id = p_booking_id;

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

END;
$$;

-- Drop the existing assign_booking_technician function first for idempotency
DROP FUNCTION IF EXISTS public.assign_booking_technician(uuid, uuid);

-- Recreate assign_booking_technician function with notification creation
CREATE OR REPLACE FUNCTION public.assign_booking_technician (
  p_booking_id UUID,
  p_technician_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Assuming admin/service role calls this
AS $$
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
          p_type := 'booking_updated',
          p_title := 'New Booking Assignment',
          p_message := 'You have been assigned a new booking (ID: ' || left(p_booking_id::text, 8) || ').',
          p_data := jsonb_build_object('booking_id', p_booking_id)
      );

      -- Notify the customer
      IF v_customer_id IS NOT NULL THEN
          PERFORM public.create_notification(
              p_user_id := v_customer_id,
              p_type := 'booking_updated',
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
$$; 
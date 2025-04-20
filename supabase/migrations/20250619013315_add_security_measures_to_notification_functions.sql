-- Migration: Add security measures to notification functions
-- Description: Ensure all notification functions have proper security settings and error handling

-- Update create_notification to be safer and better documented
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL::jsonb
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  IF p_type IS NULL THEN
    RAISE EXCEPTION 'Notification type cannot be null';
  END IF;

  IF p_title IS NULL THEN
    RAISE EXCEPTION 'Notification title cannot be null';
  END IF;

  IF p_message IS NULL THEN
    RAISE EXCEPTION 'Notification message cannot be null';
  END IF;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error but return null instead of failing the transaction
  RAISE WARNING 'Failed to create notification: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'pg_catalog', 'public';

-- Add a wrapper function to prevent incorrect call signatures
CREATE OR REPLACE FUNCTION public.create_notification_safe(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL::jsonb
) RETURNS UUID AS $$
BEGIN
  RETURN public.create_notification(p_user_id, p_type, p_title, p_message, p_data);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Safe notification wrapper caught error: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'pg_catalog', 'public';

-- Ensure update_booking_status uses the new wrapper
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
  v_booking public.bookings%ROWTYPE;
  v_current_status public.booking_status;
  v_customer_id UUID;
  v_technician_id UUID;
  v_user_role TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_notification_type TEXT := 'booking_updated';
  v_success BOOLEAN;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found with ID: %', p_booking_id;
  END IF;

  v_current_status := v_booking.status;
  v_customer_id := v_booking.customer_id;
  v_technician_id := v_booking.technician_id;

  IF p_new_status = v_current_status THEN
    RETURN FALSE;
  END IF;

  IF v_current_status = 'cancelled' AND p_new_status <> 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change a cancelled booking to %', p_new_status;
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;
    IF v_user_role = 'admin' THEN
      NULL;
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

  UPDATE public.bookings
  SET status = p_new_status,
      updated_at = timezone('utc', now())
  WHERE id = p_booking_id;
  GET DIAGNOSTICS v_success = ROW_COUNT;

  BEGIN
    v_notification_title := 'Booking Status Updated';
    v_notification_message := 'The status of your booking (ID: '||left(p_booking_id::text,8)||') has been updated to '||p_new_status||'.';
    IF v_customer_id IS NOT NULL THEN
      PERFORM public.create_notification_safe(v_customer_id, 'booking_updated', v_notification_title, v_notification_message, jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status));
    END IF;
    IF v_technician_id IS NOT NULL AND p_new_status IN ('in_progress','completed','cancelled','rescheduled') THEN
      PERFORM public.create_notification_safe(v_technician_id, 'booking_updated', v_notification_title, 'The status of your assigned booking (ID: '||left(p_booking_id::text,8)||') is now '||p_new_status||'.', jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification creation failed: %', SQLERRM;
  END;
  RETURN v_success > 0;
END;
$function$;

-- Update comments for better documentation
COMMENT ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) IS 'Creates a notification for a user with specified title, message, and data';
COMMENT ON FUNCTION public.create_notification_safe(UUID, TEXT, TEXT, TEXT, JSONB) IS 'Safe wrapper for create_notification that prevents transaction failures';
COMMENT ON FUNCTION public.update_booking_status(uuid, public.booking_status, uuid) IS 'Updates booking status with role-based permissions, using more robust notification handling'; 
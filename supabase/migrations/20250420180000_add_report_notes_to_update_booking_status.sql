-- Migration: Add report_notes parameter to update_booking_status
-- Description: Modifies the update_booking_status function to accept technician report notes
--              and updates the report_notes column only when status is 'completed'.

CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id uuid,
  p_new_status public.booking_status,
  p_user_id uuid DEFAULT NULL::uuid,
  p_report_notes text DEFAULT NULL -- Added optional parameter for report notes
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
  v_rows_affected      integer;
BEGIN
  -- -----------------------------------------------------------------------
  -- VALIDATION & PRE-CHECKS
  -- -----------------------------------------------------------------------

  -- Make sure booking exists
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found with ID: %', p_booking_id;
  END IF;

  v_current_status := v_booking.status;
  v_customer_id    := v_booking.customer_id;
  v_technician_id  := v_booking.technician_id;

  -- No-op if status already matches
  IF p_new_status = v_current_status THEN
    RETURN FALSE;
  END IF;

  -- Prevent changing a cancelled booking to anything else
  IF v_current_status = 'cancelled' AND p_new_status <> 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change a cancelled booking % status from cancelled to %', p_booking_id, p_new_status;
  END IF;

  -- -----------------------------------------------------------------------
  -- PERMISSION CHECKS (only if p_user_id is provided)
  -- -----------------------------------------------------------------------
  IF p_user_id IS NOT NULL THEN
    SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;
    IF v_user_role IS NULL THEN
       RAISE EXCEPTION 'User % not found.', p_user_id;
    END IF;

    IF v_user_role = 'admin' THEN
      -- Admins can change to any valid status
      NULL;
    ELSIF v_user_role = 'technician' THEN
      -- Technician must be assigned to the booking
      IF v_technician_id <> p_user_id THEN
         RAISE EXCEPTION 'Technician % cannot update booking % as they are not assigned.', p_user_id, p_booking_id;
      END IF;
      -- Technicians can only set specific statuses
      IF p_new_status NOT IN ('in_progress', 'completed', 'cancelled', 'rescheduled') THEN -- Added 'rescheduled'
        RAISE EXCEPTION 'Technicians can only set status to in_progress, completed, rescheduled or cancelled. Attempted: %', p_new_status;
      END IF;
    ELSIF v_user_role = 'customer' THEN
      -- Customer must own the booking
       IF v_customer_id <> p_user_id THEN
         RAISE EXCEPTION 'Customer % cannot update booking % as they do not own it.', p_user_id, p_booking_id;
      END IF;
      -- Customers can only cancel
      IF p_new_status <> 'cancelled' THEN
        RAISE EXCEPTION 'Customers can only set status to cancelled. Attempted: %', p_new_status;
      END IF;
    ELSE
      -- Unknown role or insufficient permissions
      RAISE EXCEPTION 'User % with role % does not have permission to update booking %', p_user_id, v_user_role, p_booking_id;
    END IF;
  END IF;

  -- -----------------------------------------------------------------------
  -- UPDATE BOOKING STATUS (and notes if applicable)
  -- -----------------------------------------------------------------------
  UPDATE public.bookings
  SET status     = p_new_status,
      -- Only update report_notes if the new status is 'completed' AND notes are provided
      report_notes = CASE
                       WHEN p_new_status = 'completed' AND p_report_notes IS NOT NULL THEN p_report_notes
                       ELSE report_notes -- Keep existing notes otherwise
                     END,
      updated_at = timezone('utc', now())
  WHERE id = p_booking_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- -----------------------------------------------------------------------
  --  NOTIFICATIONS (Use safe wrapper)
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
        'The status of your assigned booking (ID: ' || left(p_booking_id::text, 8) || ') is now ' || p_new_status || '.', -- Corrected message variable
        jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification creation failed in update_booking_status: %', SQLERRM;
  END;

  RETURN v_rows_affected > 0;
END;
$function$;

COMMENT ON FUNCTION public.update_booking_status(uuid, public.booking_status, uuid, text) IS 'Updates booking status and optionally report_notes with role-based permissions.'; 
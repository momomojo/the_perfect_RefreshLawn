-- Migration: Add report_notes to bookings, update function, and fix admin storage RLS
-- Description:
--   1. Adds a `report_notes` TEXT column to the `public.bookings` table.
--   2. Updates the `public.update_booking_status` function to accept an optional
--      `p_report_notes` parameter and save it when status becomes 'completed'.
--   3. Updates the RLS policy `"Users can view booking images"` on `storage.objects`
--      to allow access for users with the 'admin' role.

-- 1. Add report_notes column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS report_notes TEXT;

COMMENT ON COLUMN public.bookings.report_notes IS 'Notes submitted by the technician upon job completion.';

-- 2. Update the update_booking_status function
CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id uuid,
  p_new_status public.booking_status,
  p_user_id uuid DEFAULT NULL::uuid,
  p_report_notes TEXT DEFAULT NULL -- New parameter for report notes
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
  -- Make sure booking exists
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found with ID: %', p_booking_id;
  END IF;

  v_current_status := v_booking.status;
  v_customer_id    := v_booking.customer_id;
  v_technician_id  := v_booking.technician_id;

  -- No‑op if status already matches
  IF p_new_status = v_current_status THEN
    RETURN FALSE;
  END IF;

  -- Prevent changing a cancelled booking to anything else
  IF v_current_status = 'cancelled' AND p_new_status <> 'cancelled' THEN
    RAISE EXCEPTION 'Cannot change a cancelled booking to %', p_new_status;
  END IF;

  -- Role-based permission checks
  IF p_user_id IS NOT NULL THEN
    SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;
    IF v_user_role = 'admin' THEN
      NULL; -- Admins can do anything
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

  -- Get customer and technician IDs for notifications
  SELECT customer_id, technician_id INTO v_customer_id, v_technician_id
  FROM public.bookings WHERE id = p_booking_id;

  -- Update booking status and notes based on the new status
  CASE p_new_status
    WHEN 'in_progress'
    THEN
      UPDATE public.bookings
      SET status = p_new_status, started_at = NOW(), updated_at = timezone('utc', now())
      WHERE id = p_booking_id;
      -- Notification for customer
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.create_notification(
          v_customer_id,
          'booking_updated'::text,  -- Cast
          'Booking In Progress'::text, -- Cast
          'Your booking status has been updated to In Progress.'::text, -- Cast
          jsonb_build_object('booking_id', p_booking_id)
        );
      END IF;
    WHEN 'completed'
    THEN
      UPDATE public.bookings
      SET status = p_new_status,
          completed_at = NOW(),
          report_notes = p_report_notes, -- Save notes only on completion
          updated_at = timezone('utc', now())
      WHERE id = p_booking_id;
      -- Notify Customer
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.create_notification(
          v_customer_id,
          'booking_completed'::text, -- Cast
          'Booking Completed'::text, -- Cast
          'Your booking has been completed.'::text, -- Cast
          jsonb_build_object('booking_id', p_booking_id)
        );
      END IF;
    WHEN 'cancelled'
    THEN
      UPDATE public.bookings
      SET status = p_new_status, cancelled_at = NOW(), updated_at = timezone('utc', now())
      WHERE id = p_booking_id;
      -- Notify Customer
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.create_notification(
          v_customer_id,
          'booking_cancelled'::text, -- Cast
          'Booking Cancelled'::text,  -- Cast
          'Your booking has been cancelled.'::text, -- Cast
          jsonb_build_object('booking_id', p_booking_id)
        );
      END IF;
      -- Notify Technician (if not the one cancelling)
      IF v_technician_id IS NOT NULL AND v_technician_id <> p_user_id THEN
         PERFORM public.create_notification(
           v_technician_id,
          'booking_cancelled'::text, -- Cast
          'Booking Cancelled'::text, -- Cast
          'A booking assigned to you has been cancelled.'::text, -- Cast
           jsonb_build_object('booking_id', p_booking_id)
         );
      END IF;
    ELSE
      -- Handle other status updates (e.g., pending, scheduled) if necessary
      -- For now, just update status and updated_at
      UPDATE public.bookings
      SET status = p_new_status, updated_at = timezone('utc', now())
      WHERE id = p_booking_id;
      -- Generic Notification for customer
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.create_notification(
          v_customer_id,
          'booking_updated'::text,  -- Cast
          'Booking Status Updated'::text, -- Cast
          'The status of your booking (ID: ' || left(p_booking_id::text, 8) || ') has been updated to ' || p_new_status || '.'::text, -- Cast
          jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
        );
      END IF;
      -- Generic Notification for technician (if not the updater)
      IF v_technician_id IS NOT NULL AND v_technician_id <> p_user_id THEN
        PERFORM public.create_notification(
          v_technician_id,
          'booking_updated'::text, -- Cast
          'Booking Status Updated'::text, -- Cast
          'The status of your assigned booking (ID: ' || left(p_booking_id::text, 8) || ') is now ' || p_new_status || '.'::text, -- Cast
          jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
        );
      END IF;
  END CASE;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- Notifications (unchanged from previous migration)
  BEGIN
    v_notification_title := 'Booking Status Updated';
    v_notification_msg   := 'The status of your booking (ID: ' || left(p_booking_id::text, 8) || ') has been updated to ' || p_new_status || '.';
    IF v_customer_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_customer_id,
        'booking_updated'::text,  -- Cast
        'Booking Status Updated'::text, -- Cast
        'The status of your booking (ID: ' || left(p_booking_id::text, 8) || ') has been updated to ' || p_new_status || '.'::text, -- Cast
        jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
      );
    END IF;
    IF v_technician_id IS NOT NULL AND p_new_status IN ('in_progress', 'completed', 'cancelled', 'rescheduled') THEN
      PERFORM public.create_notification(
        v_technician_id,
        'booking_updated'::text, -- Cast
        'Booking Status Updated'::text, -- Cast
        'The status of your assigned booking (ID: ' || left(p_booking_id::text, 8) || ') is now ' || p_new_status || '.'::text, -- Cast
        jsonb_build_object('booking_id', p_booking_id, 'new_status', p_new_status)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification creation failed in update_booking_status: %', SQLERRM;
  END;

  RETURN v_rows_affected > 0;
END;
$function$;

COMMENT ON FUNCTION public.update_booking_status(uuid, public.booking_status, uuid, text)
  IS 'Updates booking status with role‑based permissions, saves report notes on completion, and returns TRUE if affected.';

-- 3. Update storage RLS policy for viewing booking images
-- Drop the existing policy first
DROP POLICY IF EXISTS "Users can view booking images" ON storage.objects;

-- Recreate policy with admin access included
CREATE POLICY "Users can view booking images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'booking-images'
    AND (
      -- Allow admin role to view any image in the bucket
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR
      -- Allow related customer or technician to view specific booking's images
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = (string_to_array(name, '/'))[1]::uuid
          AND (b.customer_id = auth.uid() OR b.technician_id = auth.uid())
      )
    )
  );

COMMENT ON POLICY "Users can view booking images" ON storage.objects IS 'Allows authenticated users (customer, technician, or admin) to view images in the booking-images bucket based on their role and relation to the booking.';

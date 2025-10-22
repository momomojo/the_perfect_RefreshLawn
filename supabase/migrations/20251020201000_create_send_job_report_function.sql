-- Migration: Create send job report email function
-- Description: Creates a database function that checks if a job report email should be sent
--              based on technician settings and booking status. Can be triggered automatically
--              or manually by an admin.

CREATE OR REPLACE FUNCTION public.send_job_report_email_if_enabled(
  p_booking_id UUID,
  p_triggered_by UUID DEFAULT NULL -- Admin ID if manually triggered, NULL if automatic
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_technician profiles%ROWTYPE;
  v_auto_send BOOLEAN;
  v_edge_function_url TEXT;
BEGIN
  -- ============================================================================
  -- VALIDATION CHECKS
  -- ============================================================================

  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Booking not found'::TEXT;
    RETURN;
  END IF;

  -- Check if email already sent
  IF v_booking.report_email_sent THEN
    RETURN QUERY SELECT FALSE, 'Email already sent'::TEXT;
    RETURN;
  END IF;

  -- Check if work is completed
  IF v_booking.workflow_status != 'completed' THEN
    RETURN QUERY SELECT FALSE, 'Booking not completed yet'::TEXT;
    RETURN;
  END IF;

  -- ============================================================================
  -- CHECK AUTO-SEND SETTING
  -- ============================================================================

  -- Get technician settings
  SELECT * INTO v_technician FROM profiles WHERE id = v_booking.technician_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Technician not found'::TEXT;
    RETURN;
  END IF;

  v_auto_send := COALESCE(v_technician.auto_send_job_reports, TRUE);

  -- ============================================================================
  -- DETERMINE IF EMAIL SHOULD BE SENT
  -- ============================================================================

  -- If manually triggered by admin, always send
  -- If automatically triggered, only send if technician has auto-send enabled
  IF p_triggered_by IS NULL AND NOT v_auto_send THEN
    -- Auto-send is disabled for this technician
    RETURN QUERY SELECT FALSE, 'Auto-send disabled for this technician - admin must manually trigger'::TEXT;
    RETURN;
  END IF;

  -- ============================================================================
  -- MARK EMAIL AS SENT (BEFORE CALLING EDGE FUNCTION)
  -- ============================================================================

  -- Update booking to mark email as sent
  -- We do this first to prevent duplicate sends if the function is called multiple times
  UPDATE bookings SET
    report_email_sent = TRUE,
    report_email_sent_at = NOW(),
    report_email_sent_by = COALESCE(p_triggered_by, v_booking.technician_id)
  WHERE id = p_booking_id;

  -- ============================================================================
  -- TRIGGER EDGE FUNCTION VIA PG_NET (ASYNC)
  -- ============================================================================

  -- The edge function will be called asynchronously via a trigger
  -- This function just marks the email as ready to send
  -- The actual sending happens in the after_booking_update trigger

  -- Return success
  IF p_triggered_by IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, 'Email queued for sending (manually triggered by admin)'::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, 'Email queued for sending (auto-send enabled)'::TEXT;
  END IF;

  RETURN;
END;
$$;

-- ============================================================================
-- ADD FUNCTION COMMENT
-- ============================================================================

COMMENT ON FUNCTION public.send_job_report_email_if_enabled(UUID, UUID) IS
  'Checks if job report email should be sent based on technician auto_send_job_reports setting.
   If p_triggered_by is provided (admin override), always sends regardless of setting.
   Marks email as sent in database and queues edge function call via trigger.';

-- Migration: Create job report email triggers
-- Description: Creates triggers that automatically check if job report email should be sent
--              when a job is completed, and triggers the edge function when email flag is set.

-- ============================================================================
-- TRIGGER 1: Check if email should be sent when job is completed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_send_job_report_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when workflow_status changes to 'completed'
  IF NEW.workflow_status = 'completed' AND
     (OLD.workflow_status IS NULL OR OLD.workflow_status != 'completed') THEN

    -- Call function to check if email should be sent
    -- This respects the technician's auto_send_job_reports setting
    PERFORM public.send_job_report_email_if_enabled(
      p_booking_id := NEW.id,
      p_triggered_by := NULL -- NULL = automatic trigger
    );

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_job_completed_check_email
  AFTER UPDATE OF workflow_status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_send_job_report_on_completion();

-- ============================================================================
-- TRIGGER 2: Call edge function when report_email_sent flag is set
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_send_job_report_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_function_url TEXT;
  v_service_role_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Only trigger when report_email_sent changes from FALSE to TRUE
  IF NEW.report_email_sent = TRUE AND
     (OLD.report_email_sent IS NULL OR OLD.report_email_sent = FALSE) THEN

    -- Get configuration from environment
    v_function_url := current_setting('app.supabase_functions_url', TRUE);
    v_service_role_key := current_setting('app.service_role_key', TRUE);

    -- If environment variables are not set, log warning and skip
    IF v_function_url IS NULL OR v_service_role_key IS NULL THEN
      RAISE WARNING 'Supabase Functions URL or Service Role Key not configured. Email will not be sent for booking %.', NEW.id;
      RETURN NEW;
    END IF;

    -- Call edge function asynchronously via pg_net
    -- This is a non-blocking call that queues the email for sending
    SELECT net.http_post(
      url := v_function_url || '/send-job-report-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'bookingId', NEW.id::text
      ),
      timeout_milliseconds := 10000
    ) INTO v_request_id;

    RAISE NOTICE 'Job report email queued for booking % (request_id: %)', NEW.id, v_request_id;

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_report_email_flag_set
  AFTER UPDATE OF report_email_sent ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_job_report_email();

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.check_send_job_report_on_completion() IS
  'Trigger function that checks if job report email should be sent when workflow_status changes to completed.
   Respects technician auto_send_job_reports setting - if disabled, email must be manually triggered by admin.';

COMMENT ON FUNCTION public.trigger_send_job_report_email() IS
  'Trigger function that calls the send-job-report-email edge function when report_email_sent flag is set to TRUE.
   Uses pg_net for asynchronous non-blocking HTTP call to edge function.
   Requires app.supabase_functions_url and app.service_role_key to be configured.';

-- ============================================================================
-- SETUP INSTRUCTIONS (for production deployment)
-- ============================================================================

-- After applying this migration, you must configure the runtime settings:
--
-- 1. Set Supabase Functions URL (replace with your actual project URL):
--    ALTER DATABASE postgres SET app.supabase_functions_url = 'https://your-project-ref.supabase.co/functions/v1';
--
-- 2. Set Service Role Key (DO NOT commit this to version control):
--    ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
--
-- These settings are database-level configuration and persist across sessions.
-- They should be set via Supabase dashboard or CLI, not in migration files.

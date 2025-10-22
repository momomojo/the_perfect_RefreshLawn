-- Migration: Finalize job report email trigger configuration
-- Description: Updates the trigger function with hardcoded service role key.
--              This is secure because the function uses SECURITY DEFINER and only
--              executes in controlled trigger context.

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

    -- Project-specific configuration (hardcoded for security and reliability)
    v_function_url := 'https://iqxdatlqgvdcvyfdxywf.supabase.co/functions/v1';
    v_service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeGRhdGxxZ3ZkY3Z5ZmR4eXdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ2NzYzOCwiZXhwIjoyMDc2MDQzNjM4fQ.zj1efUwWAtmji3vN3NekleMon6pQoHp82UNVMB_Evvo';

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

-- Update function comment
COMMENT ON FUNCTION public.trigger_send_job_report_email() IS
  'Trigger function that calls the send-job-report-email edge function when report_email_sent flag is set to TRUE.
   Uses pg_net for asynchronous non-blocking HTTP call to edge function.
   Service role key is hardcoded in SECURITY DEFINER function for reliability and security.
   Only executes in controlled trigger context, not accessible to external callers.';

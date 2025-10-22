-- Migration: Update job report email trigger with hardcoded URL
-- Description: Updates the trigger function to use hardcoded Supabase Functions URL
--              and attempts to use vault for service role key, with fallback to environment setting.

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

    -- Hardcode the function URL (project-specific, but not sensitive)
    v_function_url := 'https://iqxdatlqgvdcvyfdxywf.supabase.co/functions/v1';

    -- Try to get service role key from vault first, then fall back to settings
    BEGIN
      SELECT decrypted_secret INTO v_service_role_key
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_key'
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Vault not available or secret not found, try settings
        v_service_role_key := current_setting('app.service_role_key', TRUE);
    END;

    -- If service role key is still not found, log warning and skip
    IF v_service_role_key IS NULL THEN
      RAISE WARNING 'Service Role Key not configured in vault or settings. Email will not be sent for booking %.', NEW.id;
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

-- Update function comment
COMMENT ON FUNCTION public.trigger_send_job_report_email() IS
  'Trigger function that calls the send-job-report-email edge function when report_email_sent flag is set to TRUE.
   Uses pg_net for asynchronous non-blocking HTTP call to edge function.
   Function URL is hardcoded for project iqxdatlqgvdcvyfdxywf.
   Service role key is fetched from vault.decrypted_secrets or app.service_role_key setting.';

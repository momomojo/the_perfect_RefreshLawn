-- Migration: Fix hardcoded credentials security issue
-- Description: Removes hardcoded URL and service role key from trigger function.
--              Uses database settings instead for proper environment portability and security.
-- Priority: CRITICAL SECURITY FIX
-- Issue: Migrations 20251020203000 and 20251020204000 hardcoded sensitive credentials

-- ============================================================================
-- SECURITY FIX: Replace hardcoded credentials with environment-based config
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
  v_supabase_url TEXT;
BEGIN
  -- Only trigger when report_email_sent changes from FALSE to TRUE
  IF NEW.report_email_sent = TRUE AND
     (OLD.report_email_sent IS NULL OR OLD.report_email_sent = FALSE) THEN

    -- Get Supabase URL from settings (format: https://xxx.supabase.co)
    v_supabase_url := current_setting('app.supabase_url', TRUE);

    -- Get service role key from settings
    v_service_role_key := current_setting('app.service_role_key', TRUE);

    -- Validate configuration exists
    IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
      RAISE WARNING '[trigger_send_job_report_email] Configuration missing: supabase_url=%, service_role_key=%',
        CASE WHEN v_supabase_url IS NULL THEN 'NOT SET' ELSE 'SET' END,
        CASE WHEN v_service_role_key IS NULL THEN 'NOT SET' ELSE 'SET' END;
      RAISE WARNING '[trigger_send_job_report_email] Email will not be sent for booking %. Please configure database settings.', NEW.id;
      RETURN NEW;
    END IF;

    -- Construct function URL from base Supabase URL
    v_function_url := v_supabase_url || '/functions/v1/send-job-report-email';

    -- Call edge function asynchronously via pg_net
    -- This is a non-blocking call that queues the email for sending
    BEGIN
      SELECT net.http_post(
        url := v_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object(
          'bookingId', NEW.id::text
        ),
        timeout_milliseconds := 10000
      ) INTO v_request_id;

      RAISE NOTICE '[trigger_send_job_report_email] Job report email queued for booking % (request_id: %)', NEW.id, v_request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[trigger_send_job_report_email] Failed to queue email for booking %: %', NEW.id, SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$$;

-- Update function comment
COMMENT ON FUNCTION public.trigger_send_job_report_email() IS
  'Trigger function that calls the send-job-report-email edge function when report_email_sent flag is set to TRUE.
   Uses pg_net for asynchronous non-blocking HTTP call to edge function.

   SECURITY: No hardcoded credentials - uses database settings instead.

   Required database settings (configure via Supabase dashboard or CLI):
   - app.supabase_url: Base Supabase URL (e.g., https://xxx.supabase.co)
   - app.service_role_key: Service role key for authentication

   To configure (replace with actual values):
   ALTER DATABASE postgres SET app.supabase_url = ''https://your-project-ref.supabase.co'';
   ALTER DATABASE postgres SET app.service_role_key = ''your-service-role-key-here'';

   Environment-specific settings ensure portability across dev/staging/prod.';

-- ============================================================================
-- NOTES FOR SECURITY AUDIT
-- ============================================================================

-- ISSUE FIXED: Previous migrations (20251020203000, 20251020204000) hardcoded:
--   1. Supabase project URL (breaks portability)
--   2. Service role key (CRITICAL SECURITY ISSUE - exposed in version control)
--
-- SOLUTION: Use database settings that can be configured per environment:
--   - Settings are not stored in migrations (not in version control)
--   - Settings are environment-specific (dev/staging/prod can differ)
--   - Service role key rotation is simple (change setting, no code deploy)
--
-- SETUP REQUIRED: After applying this migration, configure settings:
--   See function comment above for ALTER DATABASE commands

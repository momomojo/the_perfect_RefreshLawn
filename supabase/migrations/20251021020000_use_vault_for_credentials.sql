-- Migration: Use Supabase Vault for secure credential storage
-- Description: Replaces database settings approach with Supabase Vault for storing
--              sensitive credentials (project URL and service role key).
-- Priority: CRITICAL SECURITY FIX
-- Supersedes: 20251021000000_fix_hardcoded_credentials_security_issue.sql
-- Reference: https://supabase.com/docs/guides/database/vault

-- ============================================================================
-- SECURITY FIX: Use Supabase Vault instead of database settings
-- ============================================================================

-- Create utility schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS util;

-- ============================================================================
-- Utility Functions to Retrieve Secrets from Vault
-- ============================================================================

-- Function to retrieve project URL from Vault
CREATE OR REPLACE FUNCTION util.project_url()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  -- Retrieve project URL from Vault
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = 'project_url';

  -- Return the secret value
  RETURN secret_value;
END;
$$;

COMMENT ON FUNCTION util.project_url() IS
  'Retrieves the Supabase project URL from Vault.

   Vault secret name: project_url
   Expected format: https://YOUR_PROJECT_REF.supabase.co

   Setup required:
   select vault.create_secret(''https://YOUR_PROJECT_REF.supabase.co'', ''project_url'');';

-- Function to retrieve service role key from Vault
CREATE OR REPLACE FUNCTION util.service_role_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  -- Retrieve service role key from Vault
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Return the secret value
  RETURN secret_value;
END;
$$;

COMMENT ON FUNCTION util.service_role_key() IS
  'Retrieves the Supabase service role key from Vault.

   Vault secret name: service_role_key
   Expected format: JWT token starting with eyJ...

   ⚠️  SECURITY: This key bypasses Row Level Security. Keep it secure!

   Setup required:
   select vault.create_secret(''YOUR_SERVICE_ROLE_KEY'', ''service_role_key'');';

-- ============================================================================
-- Rewrite Trigger Function to Use Vault
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
  v_project_url TEXT;
BEGIN
  -- Only trigger when report_email_sent changes from FALSE to TRUE
  IF NEW.report_email_sent = TRUE AND
     (OLD.report_email_sent IS NULL OR OLD.report_email_sent = FALSE) THEN

    -- Get project URL from Vault
    BEGIN
      v_project_url := util.project_url();
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[trigger_send_job_report_email] Failed to retrieve project_url from Vault: %', SQLERRM;
        RAISE WARNING '[trigger_send_job_report_email] Email will not be sent for booking %. Please configure Vault secrets.', NEW.id;
        RETURN NEW;
    END;

    -- Get service role key from Vault
    BEGIN
      v_service_role_key := util.service_role_key();
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[trigger_send_job_report_email] Failed to retrieve service_role_key from Vault: %', SQLERRM;
        RAISE WARNING '[trigger_send_job_report_email] Email will not be sent for booking %. Please configure Vault secrets.', NEW.id;
        RETURN NEW;
    END;

    -- Validate configuration exists
    IF v_project_url IS NULL OR v_service_role_key IS NULL THEN
      RAISE WARNING '[trigger_send_job_report_email] Configuration missing: project_url=%, service_role_key=%',
        CASE WHEN v_project_url IS NULL THEN 'NOT SET' ELSE 'SET' END,
        CASE WHEN v_service_role_key IS NULL THEN 'NOT SET' ELSE 'SET' END;
      RAISE WARNING '[trigger_send_job_report_email] Email will not be sent for booking %. Please configure Vault secrets.', NEW.id;
      RETURN NEW;
    END IF;

    -- Construct function URL from base project URL
    v_function_url := v_project_url || '/functions/v1/send-job-report-email';

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

COMMENT ON FUNCTION public.trigger_send_job_report_email() IS
  'Trigger function that calls the send-job-report-email edge function when report_email_sent flag is set to TRUE.
   Uses pg_net for asynchronous non-blocking HTTP call to edge function.

   SECURITY: Uses Supabase Vault for secure credential storage (no hardcoded secrets).

   Required Vault secrets (configure via SQL Editor):
   1. project_url: Base Supabase URL (e.g., https://xxx.supabase.co)
   2. service_role_key: Service role key for authentication

   Setup instructions:
   See supabase/migrations/20251021020000_use_vault_for_credentials.sql
   Or VAULT_SETUP_GUIDE.md for complete setup instructions.';

-- ============================================================================
-- NOTES FOR SECURITY AUDIT
-- ============================================================================

-- PREVIOUS ISSUES FIXED:
--   1. Migration 20251021000000 used ALTER DATABASE SET which:
--      - Requires superuser privileges (not available on managed Supabase)
--      - Results in "permission denied" error
--   2. Documentation exposed service role key in multiple files
--
-- CORRECT SOLUTION: Supabase Vault
--   - Vault secrets are encrypted at rest
--   - Secrets are not stored in migrations or version control
--   - Secrets are environment-specific (dev/staging/prod can differ)
--   - Service role key rotation is simple (update vault secret, no code deploy)
--   - Follows official Supabase best practices
--
-- SETUP REQUIRED: After applying this migration, configure Vault secrets:
--   1. Rotate any exposed service role keys immediately
--   2. Store new secrets in Vault (see VAULT_SETUP_GUIDE.md)
--   3. Verify utility functions can retrieve secrets
--   4. Test trigger function works correctly

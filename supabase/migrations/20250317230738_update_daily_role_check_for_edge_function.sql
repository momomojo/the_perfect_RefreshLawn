-- Migration to update the daily role check to work with the deployed edge function
-- This removes any pg_cron job that might have been created and sets up proper logging

-- First, check if the pg_cron extension exists and drop any scheduled job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- If pg_cron exists and our job exists, drop it to avoid duplicate executions
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-role-consistency-check') THEN
      PERFORM cron.unschedule('daily-role-consistency-check');
    END IF;
  END IF;
END;
$$;

-- Create or replace a function to support the edge function
CREATE OR REPLACE FUNCTION public.run_daily_role_consistency_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  execution_details TEXT;
  fixed_count INTEGER;
BEGIN
  -- Record start time
  start_time := now();
  
  -- Create the log table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.role_consistency_log (
    id SERIAL PRIMARY KEY,
    execution_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_ms INTEGER,
    status TEXT NOT NULL,
    details TEXT,
    fixed_count INTEGER DEFAULT 0
  );
  
  -- Run the consistency check
  BEGIN
    -- Count how many records were fixed
    SELECT COUNT(*) INTO fixed_count 
    FROM (
      SELECT * FROM check_and_fix_roles(NULL, true)
      WHERE consistency_status != 'OK'
    ) AS fixed_records;
    
    -- Record successful execution
    end_time := now();
    execution_details := 'Edge function execution successful. Fixed records: ' || COALESCE(fixed_count::text, '0');
    
    -- Insert log entry
    INSERT INTO public.role_consistency_log (
      execution_time, 
      duration_ms, 
      status, 
      details,
      fixed_count
    )
    VALUES (
      start_time, 
      EXTRACT(EPOCH FROM (end_time - start_time)) * 1000, 
      'SUCCESS', 
      execution_details,
      fixed_count
    );
    
    -- Prepare result JSON
    result := jsonb_build_object(
      'success', true,
      'message', 'Daily role consistency check completed successfully',
      'timestamp', start_time,
      'duration_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
      'fixed_count', fixed_count
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Record error
    end_time := now();
    execution_details := 'Error: ' || SQLERRM;
    
    -- Insert log entry
    INSERT INTO public.role_consistency_log (
      execution_time, 
      duration_ms, 
      status, 
      details
    )
    VALUES (
      start_time, 
      EXTRACT(EPOCH FROM (end_time - start_time)) * 1000, 
      'ERROR', 
      execution_details
    );
    
    -- Prepare error result
    result := jsonb_build_object(
      'success', false,
      'message', 'Daily role consistency check failed',
      'error', SQLERRM,
      'timestamp', start_time,
      'duration_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000
    );
  END;
  
  RETURN result;
END;
$$;

-- Add a comment explaining the function's purpose
COMMENT ON FUNCTION public.run_daily_role_consistency_check() IS 
  'Function called by the daily-role-check edge function to run the role consistency check and log results.';

-- Grant execute permission to the service role for the function
GRANT EXECUTE ON FUNCTION public.run_daily_role_consistency_check() TO service_role;

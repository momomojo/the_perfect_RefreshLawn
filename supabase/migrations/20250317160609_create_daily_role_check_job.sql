-- Migration to create a daily scheduled job for role consistency checks
-- This uses the pg_cron extension which is available in Supabase

-- First, verify if the pg_cron extension is available and create it if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Extension isn't available in the current database
    -- We'll create a wrapper function that can be called manually or via another scheduler
    CREATE OR REPLACE FUNCTION public.run_daily_role_consistency_check()
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    BEGIN
      -- Call the daily consistency check function
      PERFORM daily_role_consistency_check();
      
      -- Log the execution
      INSERT INTO public.role_consistency_log (execution_time, status, details)
      VALUES (now(), 'SUCCESS', 'Manual execution of daily_role_consistency_check');
      
      EXCEPTION WHEN OTHERS THEN
        -- Log any errors
        INSERT INTO public.role_consistency_log (execution_time, status, details)
        VALUES (now(), 'ERROR', 'Error: ' || SQLERRM);
    END;
    $$;
    
    -- Create a table to log executions if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.role_consistency_log (
      id SERIAL PRIMARY KEY,
      execution_time TIMESTAMPTZ NOT NULL DEFAULT now(),
      status TEXT NOT NULL,
      details TEXT
    );
    
    -- Add a comment explaining that pg_cron is not available
    COMMENT ON FUNCTION public.run_daily_role_consistency_check() IS 
      'Manually run the daily role consistency check. This function was created because pg_cron extension is not available.';
      
  ELSE
    -- pg_cron is available, so we can create a scheduled job
    -- Schedule the job to run at 2 AM every day
    -- This uses the pg_cron extension
    SELECT cron.schedule('daily-role-consistency-check', '0 2 * * *', $$
      SELECT public.daily_role_consistency_check();
    $$);
    
    -- Add a comment to explain the schedule
    COMMENT ON TABLE cron.job IS 
      'The daily-role-consistency-check job runs at 2 AM UTC every day to ensure user roles are consistent across tables.';
  END IF;
END;
$$;

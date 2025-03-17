-- Fix for the custom_access_token_hook function to mark it as STABLE
-- This is required for Supabase custom access token hooks
-- Migration: 20250510000005

-- Recreate the function with STABLE volatility
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims jsonb;
  user_role text;
  event_user_id uuid;
BEGIN
  BEGIN
    event_user_id := (event ->> 'user_id')::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN event;
  END;

  IF event_user_id IS NULL THEN
    RETURN event;
  END IF;

  claims := event->'claims';
  IF claims IS NULL THEN
    claims := '{}'::jsonb;
  END IF;

  SELECT ur.role::text INTO user_role
  FROM public.user_roles ur
  WHERE ur.user_id = event_user_id
  LIMIT 1;

  IF user_role IS NULL THEN
    SELECT p.role INTO user_role
    FROM public.profiles p
    WHERE p.id = event_user_id;
  END IF;

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    
    IF claims ? 'app_metadata' THEN
      claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
    ELSE
      claims := jsonb_set(claims, '{app_metadata}', json_build_object('role', user_role)::jsonb);
    END IF;
    
    event := jsonb_set(event, '{claims}', claims);
  END IF;

  RETURN event;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- Insert a record into migration_logs if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migration_logs') THEN
    INSERT INTO public.migration_logs (migration_name, description)
    VALUES ('20250510000005_fix_custom_access_token_hook', 'Changed custom_access_token_hook to STABLE volatility')
    ON CONFLICT (migration_name) DO NOTHING;
  END IF;
END $$; 
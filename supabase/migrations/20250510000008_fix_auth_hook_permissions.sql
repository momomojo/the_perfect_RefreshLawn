-- Fix permissions for custom_access_token_hook and related tables
-- The supabase_auth_admin role needs proper access to tables and functions

-- Grant full permissions to user_roles table for supabase_auth_admin
GRANT ALL PRIVILEGES ON TABLE public.user_roles TO supabase_auth_admin;

-- Grant full permissions to profiles table for supabase_auth_admin
GRANT ALL PRIVILEGES ON TABLE public.profiles TO supabase_auth_admin;

-- Fix the trigger to use the correct function
DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;

CREATE TRIGGER on_profile_role_updated
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE PROCEDURE public.sync_profile_role_to_user_roles();

-- Update the custom_access_token_hook function to handle enum values better
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE AS $$
DECLARE
  claims jsonb;
  user_role text;
  event_user_id uuid;
BEGIN
  BEGIN
    event_user_id := (event ->> 'user_id')::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'custom_access_token_hook failed to parse user_id: %', event->>'user_id';
      RETURN event;
  END;

  IF event_user_id IS NULL THEN
    RAISE WARNING 'custom_access_token_hook received null user_id';
    RETURN event;
  END IF;

  claims := event->'claims';
  IF claims IS NULL THEN
    claims := '{}'::jsonb;
  END IF;

  -- First try to get the role from user_roles
  BEGIN
    SELECT ur.role::text INTO user_role
    FROM public.user_roles ur
    WHERE ur.user_id = event_user_id
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error getting role from user_roles: %, user_id: %', SQLERRM, event_user_id;
  END;

  -- If not found in user_roles, try from profiles
  IF user_role IS NULL THEN
    BEGIN
      SELECT p.role INTO user_role
      FROM public.profiles p
      WHERE p.id = event_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error getting role from profiles: %, user_id: %', SQLERRM, event_user_id;
    END;
  END IF;

  -- Still not found, default to customer
  IF user_role IS NULL THEN
    user_role := 'customer';
  END IF;

  -- Add the role to claims
  BEGIN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    
    IF claims ? 'app_metadata' THEN
      claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
    ELSE
      claims := jsonb_set(claims, '{app_metadata}', json_build_object('role', user_role)::jsonb);
    END IF;
    
    event := jsonb_set(event, '{claims}', claims);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error setting claims: %, user_id: %, role: %', SQLERRM, event_user_id, user_role;
  END;

  RETURN event;
END;
$$;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS 'Adds user role to JWT claims. Looks up role in user_roles, then profiles, with enhanced error handling.';

-- Grant necessary permissions 
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- Insert a record into migration_logs if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migration_logs') THEN
    INSERT INTO public.migration_logs (migration_name, description)
    VALUES ('20250510000008_fix_auth_hook_permissions', 'Fixed permissions for auth hook and related tables')
    ON CONFLICT (migration_name) DO NOTHING;
  END IF;
END $$; 
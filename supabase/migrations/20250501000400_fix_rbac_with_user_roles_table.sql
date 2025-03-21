-- Migration: Fix RBAC with User Roles Table
-- Description: Implements the official Supabase approach with a separate user_roles table
-- Version: 20250501000400

-- 1. Create enum type for roles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'technician', 'customer');
    END IF;
END$$;

-- 2. Create the user_roles table as per official docs
CREATE TABLE IF NOT EXISTS public.user_roles (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
COMMENT ON TABLE public.user_roles IS 'Application roles for each user.';

-- 3. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Update the custom_access_token_hook function to use user_roles table
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  user_id uuid;
  user_role app_role;
  claims jsonb;
BEGIN
  -- Extract the user ID from the event
  user_id := (event ->> 'user_id')::uuid;
  
  -- Get the claims from the event
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  BEGIN
    -- Get the user's role from the user_roles table as per official docs
    SELECT role INTO user_role 
    FROM public.user_roles 
    WHERE user_id = user_id
    LIMIT 1;
    
    -- If the user has a role, add it to the JWT claims
    IF user_role IS NOT NULL THEN
      -- Add the role to standard locations for better compatibility
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
      
      -- Only try to set app_metadata if it exists or initialize it
      IF claims ? 'app_metadata' THEN
        claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
      ELSE
        claims := jsonb_set(claims, '{app_metadata}', json_build_object('role', user_role)::jsonb);
      END IF;
      
      -- Update the claims in the event
      event := jsonb_set(event, '{claims}', claims);
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- On error, log it but return the original event
    RAISE NOTICE 'Error in custom_access_token_hook: %', SQLERRM;
  END;
  
  -- Return the modified or original event
  RETURN event;
END;
$$ LANGUAGE plpgsql;

-- 5. Set up necessary permissions for user_roles table
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;

-- 6. Create policy to allow auth admin to read user roles
CREATE POLICY "Allow auth admin to read user roles" 
ON public.user_roles
AS permissive 
FOR SELECT
TO supabase_auth_admin
USING (true);

-- 7. Create trigger to keep user_roles in sync with profiles
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if role has changed
  IF OLD.role IS DISTINCT FROM NEW.role AND NEW.role IS NOT NULL THEN
    -- Insert or update the role in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.role::app_role)
    ON CONFLICT (user_id, role) 
    DO NOTHING;
    
    -- Delete any different roles for this user
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role::text != NEW.role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_role_updated_sync_to_user_roles ON public.profiles;
CREATE TRIGGER on_profile_role_updated_sync_to_user_roles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.sync_profile_role_to_user_roles();

-- 9. Create trigger to sync from user_roles to profiles
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the role in profiles
  UPDATE public.profiles
  SET role = NEW.role::text
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger on user_roles table
DROP TRIGGER IF EXISTS on_user_roles_updated_sync_to_profile ON public.user_roles;
CREATE TRIGGER on_user_roles_updated_sync_to_profile
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_roles_to_profile(); 
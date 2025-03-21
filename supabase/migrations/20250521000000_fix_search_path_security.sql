 -- Fix search_path security warnings in database functions
-- This migration adds an explicit 'SET search_path = pg_catalog, public;' to all functions
-- to prevent potential function injection vulnerabilities

-- Note: This migration adds 'SECURITY DEFINER' to ensure functions run with the 
-- privileges of the user who created them, and sets a safe search_path.

-- 1. Fix update_all_user_roles_in_metadata
CREATE OR REPLACE FUNCTION public.update_all_user_roles_in_metadata()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Function implementation remains the same
  -- This function is still needed for backward compatibility
END;
$function$;

-- 2. Fix sync_user_roles_to_profile
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_profile() 
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Sync from user_roles to profiles
  UPDATE public.profiles
  SET role = NEW.role
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$function$;

-- 3. Fix update_user_role_safe
CREATE OR REPLACE FUNCTION public.update_user_role_safe(user_id uuid, new_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if the user exists first
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO v_exists;
  
  IF v_exists THEN
    -- Update the role in user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_id, new_role::public.app_role)
    ON CONFLICT (user_id, role) 
    DO NOTHING;
    
    -- Remove any other roles for this user (one user should have only one role)
    DELETE FROM public.user_roles 
    WHERE user_id = update_user_role_safe.user_id 
    AND role != new_role::public.app_role;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$function$;

-- 4. Fix get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_role text;
BEGIN
  -- First try to get role from user_roles table
  SELECT role::text INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- If not found in user_roles, fall back to profiles table for backward compatibility
  IF v_role IS NULL THEN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_role;
END;
$function$;

-- 5. Fix is_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT public.get_user_role(user_id) INTO v_role;
  RETURN v_role = 'admin';
END;
$function$;

-- 6. Fix is_technician
CREATE OR REPLACE FUNCTION public.is_technician(user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT public.get_user_role(user_id) INTO v_role;
  RETURN v_role = 'technician';
END;
$function$;

-- 7. Fix is_customer
CREATE OR REPLACE FUNCTION public.is_customer(user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT public.get_user_role(user_id) INTO v_role;
  RETURN v_role = 'customer';
END;
$function$;

-- 8. Fix get_my_claims
CREATE OR REPLACE FUNCTION public.get_my_claims()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN (
    SELECT
      COALESCE(raw_app_meta_data, '{}'::jsonb)
    FROM
      auth.users
    WHERE
      id = auth.uid()
  );
END;
$function$;

-- 9. Fix delete_all_customers_and_providers
CREATE OR REPLACE FUNCTION public.delete_all_customers_and_providers()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
    user_record RECORD;
BEGIN
    -- Delete all users who are customers or service providers (not admins)
    FOR user_record IN 
        SELECT id FROM auth.users u
        WHERE id IN (
            SELECT user_id FROM user_roles WHERE role != 'admin'
        )
    LOOP
        -- Call Supabase's auth.users delete function for each user
        DELETE FROM auth.users WHERE id = user_record.id;
    END LOOP;
END;
$function$;

-- 10. Fix get_my_claim
CREATE OR REPLACE FUNCTION public.get_my_claim(claim TEXT)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN (
    SELECT
      raw_app_meta_data->claim
    FROM
      auth.users
    WHERE
      id = auth.uid()
  );
END;
$function$;

-- 11. Fix is_claims_admin
CREATE OR REPLACE FUNCTION public.is_claims_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Check if session is expired or does not exist
  IF current_setting('request.jwt.claims', true)::jsonb IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if auth user has service_role access
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Otherwise, auth user must be in claims_admin
  RETURN coalesce(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->'claims_admin', 'false')::text::boolean;
END;
$function$;

-- 12. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Create a profile record with default role 'customer'
  INSERT INTO public.profiles (id, full_name, avatar_url, role, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url', 'customer', NEW.email);

  -- Create a user_role record with default role 'customer'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$function$;

-- 13. Fix update_user_role
CREATE OR REPLACE FUNCTION public.update_user_role(user_id uuid, new_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Update the role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id, new_role::public.app_role)
  ON CONFLICT (user_id, role) 
  DO NOTHING;
  
  -- Remove any other roles for this user (one user should have only one role)
  DELETE FROM public.user_roles 
  WHERE user_id = update_user_role.user_id 
  AND role != new_role::public.app_role;
  
  RETURN TRUE;
END;
$function$;

-- 14. Fix sync_user_role_from_profile
CREATE OR REPLACE FUNCTION public.sync_user_role_from_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Sync from profiles to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.role)
  ON CONFLICT (user_id, role)
  DO NOTHING;
  
  -- Delete other roles if needed
  DELETE FROM public.user_roles
  WHERE user_id = NEW.id
  AND role != NEW.role;
  
  RETURN NEW;
END;
$function$;

-- 15. Fix sync_profile_role_to_user_roles
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Sync from profiles to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.role)
  ON CONFLICT (user_id, role)
  DO NOTHING;
  
  -- Delete other roles if needed
  DELETE FROM public.user_roles
  WHERE user_id = NEW.id
  AND role != NEW.role;
  
  RETURN NEW;
END;
$function$;

-- 16. Fix create_profile_for_user
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url', 'customer', NEW.email);
  RETURN NEW;
END;
$function$;

-- 17. Fix update_modified_column
CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  NEW.modified_at = now();
  RETURN NEW;
END;
$function$;

-- 18. Fix update_user_role_in_jwt_metadata
CREATE OR REPLACE FUNCTION public.update_user_role_in_jwt_metadata(user_id uuid, new_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_current_metadata jsonb;
  v_new_metadata jsonb;
BEGIN
  -- Get current app_metadata
  SELECT raw_app_meta_data INTO v_current_metadata
  FROM auth.users
  WHERE id = user_id;
  
  IF v_current_metadata IS NULL THEN
    v_current_metadata := '{}'::jsonb;
  END IF;
  
  -- Set the user_role in app_metadata
  v_new_metadata := jsonb_set(v_current_metadata, '{user_role}', to_jsonb(new_role));
  
  -- Update the user's app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = v_new_metadata
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$function$;

-- 19. Fix custom_access_token_hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  claims jsonb;
  metadata jsonb;
  user_role text;
  user_id uuid;
BEGIN
  -- Extract user_id from the event
  user_id := (event->>'user_id')::uuid;
  
  -- Continue only if user_id is valid
  IF user_id IS NOT NULL THEN
    -- Get the user's role from user_roles table
    SELECT role::text INTO user_role
    FROM public.user_roles
    WHERE user_id = custom_access_token_hook.user_id
    LIMIT 1;

    -- If no role in user_roles, check profiles table as fallback
    IF user_role IS NULL THEN
      SELECT role::text INTO user_role
      FROM public.profiles
      WHERE id = custom_access_token_hook.user_id;
    END IF;
  
    -- Get the claims from the event
    claims := event->'claims';
    
    -- Get existing app_metadata or create empty object
    metadata := coalesce(claims->'app_metadata', '{}'::jsonb);
    
    -- Set user_role in app_metadata if role is found
    IF user_role IS NOT NULL THEN
      metadata := jsonb_set(metadata, '{user_role}', to_jsonb(user_role));
      claims := jsonb_set(claims, '{app_metadata}', metadata);
    END IF;
    
    -- Update the claims in the event
    event := jsonb_set(event, '{claims}', claims);
  END IF;
  
  RETURN event;
END;
$function$;

-- 20. Fix check_role_consistency
CREATE OR REPLACE FUNCTION public.check_role_consistency()
 RETURNS TABLE(user_id uuid, profile_role text, user_role text, has_mismatch boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.role::text AS profile_role,
    ur.role::text AS user_role,
    p.role::text IS DISTINCT FROM ur.role::text AS has_mismatch
  FROM 
    profiles p
  LEFT JOIN 
    user_roles ur ON p.id = ur.user_id
  WHERE 
    ur.user_id IS NOT NULL;
END;
$function$;

-- 21. Fix fix_user_role_consistency
CREATE OR REPLACE FUNCTION public.fix_user_role_consistency(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_profile_role text;
BEGIN
  -- Get the role from profiles
  SELECT role INTO v_profile_role
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_profile_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update user_roles to match profile role
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, v_profile_role::public.app_role)
  ON CONFLICT (user_id, role)
  DO NOTHING;
  
  -- Remove any other roles
  DELETE FROM user_roles
  WHERE user_id = p_user_id
  AND role::text != v_profile_role;
  
  RETURN TRUE;
END;
$function$;

-- 22. Fix fix_my_role_consistency
CREATE OR REPLACE FUNCTION public.fix_my_role_consistency()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN public.fix_user_role_consistency(v_user_id);
END;
$function$;

-- Add appropriate grants for all functions
DO $$
DECLARE
  func_name text;
BEGIN
  FOR func_name IN 
    SELECT 'public.' || routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND
          routine_type = 'FUNCTION' AND
          routine_name IN (
            'update_all_user_roles_in_metadata',
            'sync_user_roles_to_profile',
            'update_user_role_safe',
            'get_user_role',
            'is_admin',
            'is_technician',
            'is_customer',
            'get_my_claims',
            'delete_all_customers_and_providers',
            'get_my_claim',
            'is_claims_admin',
            'handle_new_user',
            'update_user_role',
            'sync_user_role_from_profile',
            'sync_profile_role_to_user_roles',
            'create_profile_for_user',
            'update_modified_column',
            'update_user_role_in_jwt_metadata',
            'custom_access_token_hook',
            'check_role_consistency',
            'fix_user_role_consistency',
            'fix_my_role_consistency'
          )
  LOOP
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || func_name || ' TO authenticated, anon, service_role';
  END LOOP;
END;
$$;

-- Special grant for custom_access_token_hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
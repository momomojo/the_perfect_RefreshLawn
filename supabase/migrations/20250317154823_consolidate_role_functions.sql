-- Migration to consolidate role management functions
-- This migration:
-- 1. Creates new consolidated functions to replace redundant ones
-- 2. Updates triggers to use the new functions
-- 3. Ensures proper security settings and search path
-- 4. Maintains backward compatibility

-- First, we'll create the new consolidated functions

-- 1. New sync_user_role function to replace the three sync functions
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle syncing from profiles to user_roles
  IF TG_TABLE_NAME = 'profiles' AND OLD.role IS DISTINCT FROM NEW.role AND NEW.role IS NOT NULL THEN
    -- Insert or update the role in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.role::app_role)
    ON CONFLICT (user_id, role) 
    DO NOTHING;
    
    -- Delete any different roles for this user
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role::text != NEW.role;
    
    -- Update user metadata
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(NEW.role)
    ),
    raw_user_meta_data = 
        CASE
            WHEN raw_user_meta_data->>'role' IS NULL THEN
                jsonb_set(
                    COALESCE(raw_user_meta_data, '{}'::jsonb),
                    '{role}',
                    to_jsonb(NEW.role)
                )
            ELSE
                raw_user_meta_data
        END
    WHERE id = NEW.id;
  
  -- Handle syncing from user_roles to profiles
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    -- Update the role in profiles
    UPDATE public.profiles
    SET role = NEW.role::text
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. New manage_user_role function to replace update_user_role and update_user_role_safe
CREATE OR REPLACE FUNCTION public.manage_user_role(
  p_user_id uuid,
  p_role text,
  p_update_metadata boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  success boolean := false;
BEGIN
  -- Update profile role
  UPDATE public.profiles
  SET role = p_role
  WHERE id = p_user_id;
  
  IF FOUND THEN
    success := true;
    
    -- Update user_roles table
    -- First delete any existing roles
    DELETE FROM public.user_roles
    WHERE user_id = p_user_id;
    
    -- Insert new role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_role::app_role);
    
    -- Optionally update metadata
    IF p_update_metadata THEN
      UPDATE auth.users
      SET raw_app_meta_data = jsonb_set(
          COALESCE(raw_app_meta_data, '{}'::jsonb),
          '{role}',
          to_jsonb(p_role)
      ),
      raw_user_meta_data = jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{role}',
          to_jsonb(p_role)
      )
      WHERE id = p_user_id;
    END IF;
  END IF;
  
  RETURN success;
END;
$$;

-- 3. New create_user_profile function to replace handle_new_user and create_profile_for_user
CREATE OR REPLACE FUNCTION public.create_user_profile() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Extract role from raw_user_meta_data, otherwise default to 'customer'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  
  BEGIN
    -- 1. Insert into profiles table
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, user_role);
    
    -- 2. Insert into user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role::app_role);
    
    -- 3. Ensure app_metadata has the role
    NEW.raw_app_meta_data := 
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', user_role);
      
  EXCEPTION WHEN OTHERS THEN
    -- Fall back to creating a basic profile with customer role
    BEGIN
      INSERT INTO public.profiles (id, role)
      VALUES (NEW.id, 'customer');
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'customer'::app_role);
      
      NEW.raw_app_meta_data := 
        COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', 'customer');
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail transaction
      RAISE WARNING 'Critical error in create_user_profile: %. User ID: %',
        SQLERRM, NEW.id;
    END;
  END;
  
  RETURN NEW;
END;
$$;

-- 4. New check_and_fix_roles function to replace check_and_fix_role_consistency, fix_user_role_consistency, and check_role_consistency
CREATE OR REPLACE FUNCTION public.check_and_fix_roles(
  target_user_id uuid DEFAULT NULL,
  fix_issues boolean DEFAULT true
)
RETURNS TABLE(
  user_id uuid,
  email text,
  profiles_role text,
  user_roles_role text,
  user_metadata_role text,
  app_metadata_role text,
  consistency_status text,
  actions_taken text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  source_role text;
  actions_taken text;
BEGIN
  -- Loop through users with possible inconsistencies
  FOR user_record IN 
    SELECT 
      u.id, 
      u.email, 
      p.id AS profile_id, 
      p.role AS profile_role, 
      ur.role AS user_role, 
      u.raw_user_meta_data->>'role' AS user_meta_role,
      u.raw_app_meta_data->>'role' AS app_meta_role,
      CASE 
        WHEN ur.role IS NULL THEN 'MISSING USER_ROLES'
        WHEN p.role::text != ur.role::text THEN 'MISMATCH PROFILES/USER_ROLES'
        WHEN p.role IS NULL THEN 'MISSING PROFILE'
        WHEN (u.raw_user_meta_data->>'role') IS NULL THEN 'MISSING USER_METADATA'
        WHEN (u.raw_app_meta_data->>'role') IS NULL THEN 'MISSING APP_METADATA'
        WHEN p.role::text != (u.raw_user_meta_data->>'role') THEN 'MISMATCH PROFILE/USER_METADATA'
        WHEN p.role::text != (u.raw_app_meta_data->>'role') THEN 'MISMATCH PROFILE/APP_METADATA'
        ELSE 'OK'
      END AS status
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE (target_user_id IS NULL OR u.id = target_user_id)
  LOOP
    user_id := user_record.id;
    email := user_record.email;
    profiles_role := user_record.profile_role;
    user_roles_role := user_record.user_role::text;
    user_metadata_role := user_record.user_meta_role;
    app_metadata_role := user_record.app_meta_role;
    consistency_status := user_record.status;
    actions_taken := '';
    
    -- Only fix issues if requested
    IF fix_issues AND consistency_status != 'OK' THEN
      -- Determine the source of truth for the role
      source_role := COALESCE(
        user_record.profile_role,
        user_record.user_role::text,
        user_record.user_meta_role,
        user_record.app_meta_role,
        'customer'
      );
      
      -- Fix all inconsistencies
      -- Use the manage_user_role function to handle updates
      PERFORM manage_user_role(user_record.id, source_role, true);
      
      actions_taken := 'Fixed all inconsistencies using source: ' || source_role;
      consistency_status := 'FIXED';
    END IF;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- 5. Updated daily_role_consistency_check to use the new function
CREATE OR REPLACE FUNCTION public.daily_role_consistency_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use the new consolidated function for consistency checks
  PERFORM check_and_fix_roles(NULL, true);
END;
$$;

-- 6. Update get_user_role function to ensure security and search path
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
BEGIN
  -- First check in user_roles table (primary source of truth)
  SELECT role::text INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- If not found, fall back to profiles table
  IF v_role IS NULL THEN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_role;
END;
$$;

-- 7. Set correct security and search path for role check functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_technician()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'technician'::app_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'customer'::app_role
  );
END;
$$;

-- 8. Fix missing search_path directive in is_valid_booking_assignment
CREATE OR REPLACE FUNCTION public.is_valid_booking_assignment(booking_id uuid, tech_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF tech_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE id = booking_id AND technician_id = tech_id
  );
END;
$$;

-- Now update the triggers to use the new functions

-- Drop the old triggers first
DROP TRIGGER IF EXISTS sync_profile_role_to_user_roles_trigger ON public.profiles;
DROP TRIGGER IF EXISTS sync_user_roles_to_profile_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;
DROP TRIGGER IF EXISTS add_role_on_user_creation ON auth.users;
DROP TRIGGER IF EXISTS add_role_on_user_login ON auth.users;

-- Create new consolidated triggers
CREATE TRIGGER sync_user_role_from_profiles_trigger
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role();

CREATE TRIGGER sync_user_role_from_user_roles_trigger
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role();

CREATE TRIGGER create_profile_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_profile();

-- For backward compatibility, create function aliases to maintain any existing code dependencies
-- These functions will call the new consolidated functions

CREATE OR REPLACE FUNCTION public.fix_user_role_consistency(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid, email text, previous_status text, action_taken text, new_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result RECORD;
BEGIN
  FOR result IN SELECT * FROM check_and_fix_roles(target_user_id, true)
  LOOP
    user_id := result.user_id;
    email := result.email;
    previous_status := result.consistency_status;
    action_taken := result.actions_taken;
    new_status := 'FIXED';
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_role_consistency()
RETURNS TABLE(
  user_id uuid,
  email text,
  profiles_role text,
  user_roles_role text,
  user_metadata_role text,
  app_metadata_role text,
  consistency_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result RECORD;
BEGIN
  FOR result IN SELECT * FROM check_and_fix_roles(NULL, false)
  LOOP
    user_id := result.user_id;
    email := result.email;
    profiles_role := result.profiles_role;
    user_roles_role := result.user_roles_role;
    user_metadata_role := result.user_metadata_role;
    app_metadata_role := result.app_metadata_role;
    consistency_status := result.consistency_status;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.fix_my_role_consistency()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result RECORD;
  my_user_id uuid := auth.uid();
  return_data jsonb;
BEGIN
  -- Verify user is authenticated
  IF my_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  -- Fix inconsistencies for the current user
  SELECT * INTO result FROM check_and_fix_roles(my_user_id, true) LIMIT 1;
  
  -- Build return data
  return_data := jsonb_build_object(
    'user_id', result.user_id,
    'email', result.email,
    'status', result.consistency_status,
    'action_taken', result.actions_taken
  );
  
  RETURN return_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_role(user_id uuid, new_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Uses the new manage_user_role function
  RETURN manage_user_role(user_id, new_role, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_role_safe(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Uses the new manage_user_role function
  PERFORM manage_user_role(p_user_id, p_role, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_all_user_roles_in_metadata()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_rec RECORD;
BEGIN
  -- For each user
  FOR user_rec IN SELECT id, role FROM profiles
  LOOP
    -- Update metadata using manage_user_role function
    PERFORM manage_user_role(user_rec.id, user_rec.role, true);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_role_in_jwt_metadata()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This is now an alias for update_all_user_roles_in_metadata
  PERFORM update_all_user_roles_in_metadata();
END;
$$;

-- Set correct security for custom_access_token_hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  user_id uuid;
  user_role text;
BEGIN
  -- Extract user ID
  BEGIN
    user_id := (event ->> 'user_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to extract user ID from event: %', event;
    RETURN event;
  END;

  -- Skip if no user ID (shouldn't happen but just in case)
  IF user_id IS NULL THEN
    RAISE WARNING 'No user ID found in hook: %', event;
    RETURN event;
  END IF;

  -- Get role, prioritizing user_roles table, then falling back to profiles
  SELECT role::text INTO user_role
  FROM user_roles
  WHERE user_id = user_id
  LIMIT 1;
  
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = user_id
    LIMIT 1;
  END IF;

  -- Don't modify event if no role found (shouldn't happen with proper triggers)
  IF user_role IS NULL THEN
    RAISE WARNING 'No role found for user with ID: %', user_id;
    RETURN event;
  END IF;

  -- Set claims in the event object
  event := jsonb_set(
    event,
    '{claims}',
    COALESCE(event->'claims', '{}'::jsonb) || 
    jsonb_build_object('role', user_role)
  );

  RETURN event;
END;
$$;

-- Keep HypoPG functions unchanged as they are part of an extension

-- Keep update_modified_column function unchanged as it has a specific purpose
-- Just ensure search_path is set correctly
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Comment out the dangerous function that should not be in production
-- It's better to simply not include it in the migration
/*
CREATE OR REPLACE FUNCTION public.delete_all_customers_and_providers()
RETURNS TABLE(status text, customers_deleted integer, technicians_deleted integer, bookings_deleted integer, payment_methods_deleted integer, reviews_deleted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_customers INTEGER;
  deleted_technicians INTEGER;
  deleted_bookings INTEGER;
  deleted_payment_methods INTEGER;
  deleted_reviews INTEGER;
BEGIN
  -- Do not include this dangerous function
  status := 'FUNCTION DISABLED FOR SECURITY REASONS';
  customers_deleted := 0;
  technicians_deleted := 0;
  bookings_deleted := 0;
  payment_methods_deleted := 0;
  reviews_deleted := 0;
  
  RETURN NEXT;
END;
$$;
*/

-- Update security policies to work with the new functions
-- All RLS policies that used the old functions should continue to work
-- since we maintained the same function names and signatures
-- No need to update any policies

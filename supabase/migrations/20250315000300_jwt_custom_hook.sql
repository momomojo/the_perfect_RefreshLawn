-- Migration: JWT Custom Access Token Hook
-- Description: Sets up the custom access token hook for adding user roles to JWT
-- Version: 20250315000300

-- Create the custom access token hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  user_id uuid;
  user_role text;
BEGIN
  -- Extract the user ID from the event
  user_id := (event ->> 'user_id')::uuid;
  
  -- Get the user's role from the profiles table
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  
  -- If the user has a role, add it to the JWT claims
  IF user_role IS NOT NULL THEN
    -- Add the role to both metadata.role (for our helper functions) 
    -- and app_metadata.role (for client access)
    RETURN jsonb_set(
      jsonb_set(
        event,
        '{metadata}',
        jsonb_set(
          COALESCE(event -> 'metadata', '{}'::jsonb),
          '{role}',
          to_jsonb(user_role)
        )
      ),
      '{app_metadata}',
      jsonb_set(
        COALESCE(event -> 'app_metadata', '{}'::jsonb),
        '{role}',
        to_jsonb(user_role)
      )
    );
  ELSE
    -- If no role found, return the original event
    RETURN event;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPORTANT: After deploying this migration, you must enable the JWT hook in the Supabase Dashboard:
-- 1. Go to Authentication > Hooks
-- 2. For the "JWT Access Token" event type, add a hook
-- 3. Select "Database Function" as the hook type
-- 4. Choose "public.custom_access_token_hook" as the function
-- 5. Save the changes

-- Function to update existing users' app_metadata with their role
CREATE OR REPLACE FUNCTION public.update_user_role_in_jwt_metadata()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users and update their app_metadata
  FOR user_record IN SELECT auth.users.id, profiles.role FROM auth.users JOIN profiles ON auth.users.id = profiles.id
  LOOP
    -- Update the user's app_metadata with their role
    UPDATE auth.users 
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', user_record.role)
    WHERE id = user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
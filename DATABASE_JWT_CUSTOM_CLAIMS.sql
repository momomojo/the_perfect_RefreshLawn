-- ================================================================
-- JWT CUSTOM CLAIMS HOOK
-- Run this AFTER running DATABASE_RLS_POLICIES.sql
-- URL: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/sql/new
-- ================================================================

-- Create the custom access token hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  user_id_val uuid;
  user_role text;
BEGIN
  -- Extract the user ID from the event
  user_id_val := (event ->> 'user_id')::uuid;

  -- Get the user's role from the profiles table
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id_val;

  -- If the user has a role, add it to the JWT claims
  IF user_role IS NOT NULL THEN
    -- Add the role to claims
    RETURN jsonb_set(
      event,
      '{claims,user_role}',
      to_jsonb(user_role)
    );
  ELSE
    -- If no role found, return the original event
    RETURN event;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- ================================================================
-- AFTER RUNNING THIS:
-- You MUST manually enable the JWT hook in Supabase Dashboard:
--
-- 1. Go to: https://supabase.com/dashboard/project/iqxdatlqgvdcvyfdxywf/auth/hooks
-- 2. Click "Add Hook" or "Enable Hook"
-- 3. Event Type: "Custom Access Token"
-- 4. Hook Type: "Postgres Function"
-- 5. Postgres Function: Select "public.custom_access_token_hook"
-- 6. Click "Save" or "Create"
-- ================================================================

SELECT 'JWT Custom Claims function created! NOW GO ENABLE THE HOOK IN DASHBOARD!' AS status;

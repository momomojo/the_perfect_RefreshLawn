-- Migration to fix the ambiguous column reference in the custom_access_token_hook function
-- The issue is in the WHERE clause where 'user_id = user_id' creates an ambiguity

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  user_role text;
BEGIN
  -- Extract user ID
  BEGIN
    v_user_id := (event ->> 'user_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to extract user ID from event: %', event;
    RETURN event;
  END;

  -- Skip if no user ID (shouldn't happen but just in case)
  IF v_user_id IS NULL THEN
    RAISE WARNING 'No user ID found in hook: %', event;
    RETURN event;
  END IF;

  -- Get role, prioritizing user_roles table, then falling back to profiles
  -- Fix: Change 'user_id = user_id' to 'user_id = v_user_id' to avoid ambiguity
  SELECT role::text INTO user_role
  FROM user_roles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = v_user_id
    LIMIT 1;
  END IF;

  -- Don't modify event if no role found (shouldn't happen with proper triggers)
  IF user_role IS NULL THEN
    RAISE WARNING 'No role found for user with ID: %', v_user_id;
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

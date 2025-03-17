-- This script verifies that the consolidated role functions are working correctly
-- Run it with psql or in the Supabase SQL Editor to check the role system

-- Step 1: Run a consistency check to see if there are any issues
SELECT * FROM check_and_fix_roles(NULL, false);

-- Step 2: Test the get_user_role function with a specific user
-- Replace the UUID with an actual user ID from your database
SELECT 
  id, 
  email, 
  get_user_role(id) AS role_from_function,
  (SELECT role FROM profiles WHERE id = u.id) AS role_from_profiles,
  (SELECT role::text FROM user_roles WHERE user_id = u.id LIMIT 1) AS role_from_user_roles
FROM 
  auth.users u
LIMIT 5;

-- Step 3: Test the custom_access_token_hook function with a mock event payload
-- This simulates what Supabase Auth would send
DO $$
DECLARE
  test_user_id uuid;
  test_role text;
  test_event jsonb;
  result jsonb;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  SELECT role INTO test_role FROM profiles WHERE id = test_user_id;
  
  -- Create test event payload
  test_event := jsonb_build_object(
    'user_id', test_user_id,
    'claims', jsonb_build_object(
      'aud', 'authenticated',
      'exp', extract(epoch from now() + interval '1 hour')::bigint,
      'iat', extract(epoch from now())::bigint,
      'sub', test_user_id,
      'role', 'authenticated'
    ),
    'authentication_method', 'password'
  );
  
  -- Call the hook
  result := custom_access_token_hook(test_event);
  
  -- Output the results
  RAISE NOTICE 'Test User ID: %', test_user_id;
  RAISE NOTICE 'Expected role from profiles: %', test_role;
  RAISE NOTICE 'Original JWT claims: %', test_event->'claims';
  RAISE NOTICE 'Modified JWT claims: %', result->'claims';
  RAISE NOTICE 'Role in JWT claims: %', result->'claims'->>'role';
END;
$$;

-- Step 4: Test the manage_user_role function (This will modify data, so be careful)
-- Comment this out in production or when not actively testing
/*
DO $$
DECLARE
  test_user_id uuid;
  original_role text;
  new_role text;
  success boolean;
BEGIN
  -- Get a test user (prefer a test account, not a real user)
  SELECT id INTO test_user_id FROM auth.users 
  WHERE email LIKE '%test%' OR email LIKE '%example%'
  LIMIT 1;
  
  -- Get the original role
  SELECT role INTO original_role FROM profiles WHERE id = test_user_id;
  
  -- Determine a new role that's different
  IF original_role = 'admin' THEN
    new_role := 'customer';
  ELSIF original_role = 'technician' THEN
    new_role := 'customer';
  ELSE
    new_role := 'technician';
  END IF;
  
  -- Update the role
  success := manage_user_role(test_user_id, new_role, true);
  
  -- Output the results
  RAISE NOTICE 'Test User ID: %', test_user_id;
  RAISE NOTICE 'Original role: %', original_role;
  RAISE NOTICE 'New role: %', new_role;
  RAISE NOTICE 'Update success: %', success;
  
  -- Verify the changes
  RAISE NOTICE 'Profiles role after update: %', (SELECT role FROM profiles WHERE id = test_user_id);
  RAISE NOTICE 'User_roles role after update: %', (SELECT role FROM user_roles WHERE user_id = test_user_id);
  
  -- Revert the change to original role
  PERFORM manage_user_role(test_user_id, original_role, true);
  RAISE NOTICE 'Reverted back to original role: %', original_role;
END;
$$;
*/

-- Step 5: Verify the triggers exist
SELECT 
  tgname AS trigger_name,
  relname AS table_name,
  proname AS function_name
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE NOT tgisinternal
  AND proname IN ('sync_user_role', 'create_user_profile')
  AND nspname = 'public'; 
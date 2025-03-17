-- Test Custom Access Token Hook with real user IDs
-- This script will help verify that the hook correctly adds role claims

-- Step 1: Get a real user ID from the database
SELECT id, email FROM auth.users LIMIT 5;
-- Copy a user ID from the results above and use it in the test below

-- Step 2: Test the hook with a complete set of required claims and a real user ID
-- Replace 'PASTE_USER_ID_HERE' with an actual user ID from Step 1
WITH test_event AS (
  SELECT jsonb_build_object(
    'user_id', 'PASTE_USER_ID_HERE'::uuid, -- Replace with real user ID
    'claims', jsonb_build_object(
      'iss', 'supabase',
      'aud', 'authenticated',
      'role', 'authenticated',
      'exp', extract(epoch from now() + interval '1 hour')::bigint,
      'iat', extract(epoch from now())::bigint,
      'sub', 'PASTE_USER_ID_HERE', -- Replace with same user ID
      'session_id', uuid_generate_v4(),
      'aal', 'aal1'
    )
  ) AS event
)
SELECT
  event AS input,
  public.custom_access_token_hook(event) AS output
FROM test_event;

-- Step 3: Verify the user has a role assigned in either user_roles or profiles
-- Replace 'PASTE_USER_ID_HERE' with the same user ID used above
SELECT 
  u.id, 
  u.email,
  ur.role AS user_roles_role,
  p.role AS profiles_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.id = 'PASTE_USER_ID_HERE'::uuid;

-- Step 4: If user has no role, assign one and test again
-- Uncomment and run if needed:
/*
-- Insert a role for the user in user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES ('PASTE_USER_ID_HERE'::uuid, 'customer')
ON CONFLICT (user_id, role) DO NOTHING;

-- Run the test again to see if the role is now added to claims
*/ 
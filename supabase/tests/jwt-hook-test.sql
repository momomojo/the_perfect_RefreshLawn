-- JWT HOOK TEST SCRIPT
-- Run this in the Supabase SQL Editor to verify the JWT hook setup

-- PART 1: Check function existence
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'custom_access_token_hook'
) AS hook_function_exists;

-- PART 2: Test the hook function with sample data
WITH test_event AS (
  SELECT jsonb_build_object(
    'user_id', (SELECT id FROM auth.users LIMIT 1),
    'app_metadata', jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']
    )
  ) AS event
)
SELECT 
  event AS original_event,
  public.custom_access_token_hook(event) AS modified_event
FROM test_event;

-- PART 3: Check roles in profiles and app_metadata
SELECT 
  u.id, 
  u.email, 
  p.role AS profile_role, 
  u.raw_app_meta_data->'user_role' AS app_metadata_role,
  CASE WHEN (u.raw_app_meta_data->'user_role')::text = to_jsonb(p.role::text)::text 
       THEN '✅ Roles match' 
       ELSE '❌ Roles mismatch' 
  END as status
FROM auth.users u
JOIN profiles p ON u.id = p.id
LIMIT 10;

-- PART 4: Test helper functions (if these return true for appropriate users, they're working)
DO $$
DECLARE
  admin_id uuid;
  tech_id uuid;
  cust_id uuid;
BEGIN
  -- Get an ID for each role type if available
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
  SELECT id INTO tech_id FROM profiles WHERE role = 'technician' LIMIT 1;
  SELECT id INTO cust_id FROM profiles WHERE role = 'customer' LIMIT 1;
  
  -- Output information about the role check functions
  RAISE NOTICE 'Role check functions exist:';
  RAISE NOTICE 'auth.is_admin(): %', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin');
  RAISE NOTICE 'auth.is_technician(): %', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_technician');
  RAISE NOTICE 'auth.is_customer(): %', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_customer');
  
  -- Note about JWT-based role check functions
  RAISE NOTICE '';
  RAISE NOTICE 'JWT-based role check functions exist:';
  RAISE NOTICE 'auth.jwt_is_admin(): %', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'jwt_is_admin');
  RAISE NOTICE 'auth.jwt_is_technician(): %', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'jwt_is_technician');
  RAISE NOTICE 'auth.jwt_is_customer(): %', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'jwt_is_customer');
END
$$; 
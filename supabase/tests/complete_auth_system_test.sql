-- COMPLETE AUTHENTICATION SYSTEM TEST SCRIPT
-- This script verifies all aspects of the RefreshLawn authentication system
-- Run this in Supabase SQL Editor to ensure everything is working properly

-- =============================================
-- PART 1: BASIC DATABASE STRUCTURE VERIFICATION
-- =============================================

-- 1.1: Check if all necessary tables exist
SELECT 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') AS profiles_table_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') AS user_roles_table_exists,
  EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') AS app_role_enum_exists;

-- 1.2: Check if all helper functions exist
SELECT 
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') AS is_admin_exists,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_technician') AS is_technician_exists,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_customer') AS is_customer_exists,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_role_admin') AS is_role_admin_exists,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_role_technician') AS is_role_technician_exists,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_role_customer') AS is_role_customer_exists,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'custom_access_token_hook') AS custom_access_token_hook_exists,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_role_consistency') AS check_role_consistency_exists,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fix_user_role_consistency') AS fix_user_role_consistency_exists;

-- 1.3: Check if all triggers are set up
SELECT 
  trigger_name,
  event_manipulation AS event,
  action_statement AS action
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND (event_object_table = 'profiles' OR event_object_table = 'user_roles')
ORDER BY event_object_table, trigger_name;

-- =============================================
-- PART 2: DATA CONSISTENCY VERIFICATION
-- =============================================

-- 2.1: Check for users with inconsistent role assignments
SELECT * FROM public.check_role_consistency()
WHERE consistency_status != 'OK'
LIMIT 10;

-- 2.2: Count users with each role
SELECT 
  p.role AS profile_role,
  COUNT(*) AS user_count
FROM public.profiles p
GROUP BY p.role
ORDER BY COUNT(*) DESC;

-- 2.3: Compare role counts across different tables
SELECT
  'profiles' AS source,
  role,
  COUNT(*) AS count
FROM public.profiles
WHERE role IS NOT NULL
GROUP BY role

UNION ALL

SELECT
  'user_roles' AS source,
  role::text,
  COUNT(*) AS count
FROM public.user_roles
GROUP BY role

UNION ALL

SELECT
  'user_metadata' AS source,
  raw_user_meta_data->>'role' AS role,
  COUNT(*) AS count
FROM auth.users
WHERE raw_user_meta_data->>'role' IS NOT NULL
GROUP BY raw_user_meta_data->>'role'

UNION ALL

SELECT
  'app_metadata' AS source,
  raw_app_meta_data->>'role' AS role,
  COUNT(*) AS count
FROM auth.users
WHERE raw_app_meta_data->>'role' IS NOT NULL
GROUP BY raw_app_meta_data->>'role'

ORDER BY source, role;

-- =============================================
-- PART 3: CUSTOM ACCESS TOKEN HOOK TESTING
-- =============================================

-- 3.1: Get some test users
SELECT id, email FROM auth.users LIMIT 5;
-- Copy a user ID from here and use it in the tests below

-- 3.2: Test the hook with complete claims and user ID
-- Replace 'PASTE_USER_ID_HERE' with an actual user ID from 3.1
WITH test_event AS (
  SELECT jsonb_build_object(
    'user_id', 'PASTE_USER_ID_HERE'::uuid,
    'claims', jsonb_build_object(
      'iss', 'supabase',
      'aud', 'authenticated',
      'role', 'authenticated',
      'exp', extract(epoch from now() + interval '1 hour')::bigint,
      'iat', extract(epoch from now())::bigint,
      'sub', 'PASTE_USER_ID_HERE',
      'session_id', uuid_generate_v4(),
      'aal', 'aal1'
    )
  ) AS event
)
SELECT
  event AS input,
  public.custom_access_token_hook(event) AS output,
  -- Extract role claims from output for easier viewing
  public.custom_access_token_hook(event)->'claims'->'user_role' AS user_role_claim,
  public.custom_access_token_hook(event)->'claims'->'app_metadata'->'role' AS app_metadata_role_claim
FROM test_event;

-- 3.3: Verify role information for test user
-- Replace 'PASTE_USER_ID_HERE' with the same user ID used above
SELECT 
  u.id, 
  u.email,
  p.role AS profiles_role,
  ur.role AS user_roles_role,
  u.raw_user_meta_data->'role' AS user_metadata_role,
  u.raw_app_meta_data->'role' AS app_metadata_role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.id = 'PASTE_USER_ID_HERE'::uuid;

-- =============================================
-- PART 4: ROW LEVEL SECURITY POLICY VERIFICATION
-- =============================================

-- 4.1: Check all RLS policies
SELECT
  schemaname AS schema,
  tablename AS table,
  policyname AS policy,
  permissive,
  roles,
  cmd AS operation,
  CASE
    WHEN format('%s', qual) != '' THEN format('%s', qual)
    ELSE 'ALL ROWS'
  END AS using_qualifier,
  CASE
    WHEN format('%s', with_check) != '' THEN format('%s', with_check)
    ELSE 'NO CHECK'
  END AS with_check_qualifier
FROM
  pg_policies
WHERE
  schemaname = 'public'
ORDER BY
  tablename, policyname;

-- 4.2: Test auth.is_admin() function (if you are currently logged in as admin)
SELECT auth.is_admin() AS is_current_user_admin;

-- 4.3: Test auth.is_technician() function (if you are currently logged in as technician)
SELECT auth.is_technician() AS is_current_user_technician;

-- 4.4: Test auth.is_customer() function (if you are currently logged in as customer)
SELECT auth.is_customer() AS is_current_user_customer;

-- =============================================
-- PART 5: TEST ROLE CONSISTENCY REPAIR FUNCTION
-- =============================================

-- 5.1: Fix any inconsistencies and report the results (won't run by default)
/*
SELECT * FROM public.fix_user_role_consistency();
*/

-- =============================================
-- PART 6: VERIFY REQUIRED DASHBOARD CONFIGURATION
-- =============================================

-- This cannot be tested via SQL - manual verification required.
-- Check the Supabase Dashboard: Authentication > Hooks > JWT Access Token
-- It should have public.custom_access_token_hook enabled.

-- =============================================
-- NOTES AND ADDITIONAL MANUAL VERIFICATION STEPS
-- =============================================

/*
1. To verify JWT claims, you need to log in through your application and check:
   - Use the verifyJwtHookWorking() function client-side
   - Or decode the JWT token manually using jwt.io

2. To test RLS policies properly, you need to test with each role type:
   - Log in as admin, technician, and customer
   - Try to access different resources with each role
   - Verify that proper permissions are enforced

3. Schema changes that might require attention:
   - If adding a new role, update the app_role enum
   - If adding a new table, ensure RLS policies are created
*/ 
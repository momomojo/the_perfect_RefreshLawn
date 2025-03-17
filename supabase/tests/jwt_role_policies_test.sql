-- JWT ROLE POLICIES TEST SCRIPT
-- This script helps verify that our JWT role policies are working correctly

-- PART 1: Get a real user ID from the database
SELECT id, email FROM auth.users LIMIT 5;
-- Copy a user ID from the results above and use it in the tests below

-- PART 2: Test JWT role retrieval function
SELECT auth.get_jwt_role() AS current_jwt_role;

-- PART 3: Test with a sample JWT (this simulates what happens in policies)
-- Replace 'PASTE_USER_ID_HERE' with an actual user ID from Part 1
WITH jwt_test AS (
  SELECT 
    -- Direct JWT role checks (new functions)
    auth.is_role_admin() AS is_admin_jwt,
    auth.is_role_technician() AS is_technician_jwt,
    auth.is_role_customer() AS is_customer_jwt,
    
    -- Combined checks (JWT + database fallback)
    auth.is_admin() AS is_admin_combined,
    auth.is_technician() AS is_technician_combined,
    auth.is_customer() AS is_customer_combined,
    
    -- Get the role value directly
    auth.get_jwt_role() AS jwt_role
)
SELECT * FROM jwt_test;

-- PART 4: Compare database role with JWT role for a specific user
-- Replace 'PASTE_USER_ID_HERE' with the same user ID used above
SELECT 
  u.id, 
  u.email,
  p.role AS database_role,
  ur.role AS user_roles_role,
  
  -- JWT role would be visible when actually logged in as this user
  'Login as this user to see JWT role' AS jwt_role_note
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.id = 'PASTE_USER_ID_HERE'::uuid;

-- PART 5: Analyze role assignment consistency
-- This query shows users who might have inconsistent role assignments
SELECT 
  u.id, 
  u.email,
  p.role AS profiles_role,
  ur.role AS user_roles_role,
  u.raw_user_meta_data->'role' AS user_metadata_role,
  u.raw_app_meta_data->'role' AS app_metadata_role,
  CASE 
    WHEN p.role::text != ur.role::text OR 
         p.role::text != (u.raw_user_meta_data->>'role') OR
         p.role::text != (u.raw_app_meta_data->>'role')
    THEN 'INCONSISTENT' 
    ELSE 'OK' 
  END AS role_consistency_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE p.role IS NOT NULL
LIMIT 10;

-- NOTES:
-- 1. To see actual JWT values in a real session, use the verification utility function:
--    SELECT * FROM public.verifyJwtHookWorking();
-- 2. After changing roles, users need to get a new JWT token (by logging out and back in)
--    or by refreshing their session using supabase.auth.refreshSession()
-- 3. If using auth.is_role_* functions in policies, they only check JWT claims and not the database 
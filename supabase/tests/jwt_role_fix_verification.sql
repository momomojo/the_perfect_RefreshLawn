-- RefreshLawn JWT Role Fix Verification
-- Run this script in the Supabase SQL Editor to verify the fixes

-- 1. Check if custom_access_token_hook function is correct
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'custom_access_token_hook';

-- 2. Check if auth helper functions are correct
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('is_admin_jwt', 'is_technician_jwt', 'is_customer_jwt', 'user_role');

-- 3. Check if profile creation function is correct
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'create_profile_for_user';

-- 4. Check user metadata in auth.users
-- Replace with specific user IDs if needed
SELECT id, raw_user_meta_data->>'role' as user_meta_role, 
       raw_app_meta_data->>'role' as app_meta_role
FROM auth.users
LIMIT 10;

-- 5. Check profiles table roles
SELECT id, role
FROM profiles
LIMIT 10;

-- IMPORTANT: After verifying these SQL changes, make sure to:
-- 1. Go to Authentication > Hooks in the Supabase Dashboard
-- 2. Enable the JWT custom hook
-- 3. Select "public.custom_access_token_hook" as the function
-- 4. Save the changes
-- 5. Test sign-up with different roles
-- 6. Have existing users sign out and sign back in 
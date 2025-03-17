-- RefreshLawn Migration Verification Script
-- Run this in the Supabase SQL Editor to verify migrations

-- Check for tables
WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'profiles',
    'services',
    'recurring_plans',
    'bookings',
    'reviews',
    'payment_methods'
  ]) AS table_name
)
SELECT 
  e.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN 'FOUND ✓' ELSE 'MISSING ✗' END AS status
FROM 
  expected_tables e
LEFT JOIN 
  information_schema.tables t ON t.table_name = e.table_name AND t.table_schema = 'public';

-- Check for functions
WITH expected_functions AS (
  SELECT unnest(ARRAY[
    'custom_access_token_hook',
    'add_user_role_to_jwt',
    'update_user_role_in_jwt_metadata',
    'is_admin',
    'is_technician',
    'is_customer'
  ]) AS function_name,
  unnest(ARRAY[
    'auth',
    'public',
    'public',
    'auth',
    'auth',
    'auth'
  ]) AS function_schema
)
SELECT 
  e.function_schema || '.' || e.function_name AS function_name,
  CASE WHEN p.proname IS NOT NULL THEN 'FOUND ✓' ELSE 'MISSING ✗' END AS status
FROM 
  expected_functions e
LEFT JOIN 
  pg_proc p ON p.proname = e.function_name
LEFT JOIN 
  pg_namespace n ON n.oid = p.pronamespace AND n.nspname = e.function_schema;

-- Check Row Level Security is enabled
WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'profiles',
    'services',
    'recurring_plans',
    'bookings',
    'reviews',
    'payment_methods'
  ]) AS table_name
)
SELECT 
  pc.relname AS table_name,
  CASE WHEN pc.relrowsecurity THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END AS rls_status
FROM 
  expected_tables e
JOIN 
  pg_class pc ON pc.relname = e.table_name
JOIN 
  pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public';

-- Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM 
  pg_policies
WHERE 
  schemaname = 'public'
ORDER BY
  tablename, policyname;

-- Check JWT hook is present and enabled
-- Note: You must manually check in the Dashboard: Authentication > Hooks
SELECT 
  '⚠️ IMPORTANT: Manually verify the JWT hook is enabled in Authentication > Hooks' AS action_required; 
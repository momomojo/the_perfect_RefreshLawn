-- Script to test the RBAC implementation

-- 1. Check if custom_access_token_hook is correctly implemented
SELECT prosrc, pronargs, proname 
FROM pg_proc 
WHERE proname = 'custom_access_token_hook';

-- 2. Check if helper functions are correctly implemented
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('is_admin_jwt', 'is_technician_jwt', 'is_customer_jwt', 'user_role');

-- 3. Test the hook with a sample event
WITH event AS (
  SELECT jsonb_build_object(
    'user_id', (SELECT id FROM auth.users LIMIT 1),
    'claims', jsonb_build_object(
      'aud', 'authenticated',
      'exp', extract(epoch from (now() + interval '1 hour'))::integer,
      'sub', (SELECT id FROM auth.users LIMIT 1),
      'role', 'authenticated'
    )
  ) AS event_data
)
SELECT 
  event_data AS input_event,
  public.custom_access_token_hook(event_data) AS output_event
FROM event;

-- 4. Check if permissions are correctly set
SELECT 
  grantee,
  privilege_type
FROM 
  information_schema.role_routine_grants
WHERE 
  routine_name = 'custom_access_token_hook';

-- 5. Check for permission on profiles table
SELECT 
  grantee,
  privilege_type
FROM 
  information_schema.role_table_grants
WHERE 
  table_name = 'profiles' AND
  grantee = 'supabase_auth_admin';

-- 6. Check the hook configuration in the database
SELECT EXISTS(
  SELECT 1 FROM pg_extension 
  WHERE extname = 'pg_net'
) AS pg_net_extension_exists;

-- The actual verification requires checking the Supabase dashboard
-- to confirm the hook is enabled under Authentication > Hooks
SELECT 'Remember to verify that the hook is enabled in the Supabase dashboard' AS note; 
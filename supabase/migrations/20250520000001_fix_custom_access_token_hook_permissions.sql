-- Migration to fix permissions for the custom_access_token_hook function
-- Ensure proper security settings for auth hook functions

-- Grant schema usage to supabase_auth_admin (if not already granted)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Grant usage on user_roles table to supabase_auth_admin
GRANT ALL ON public.user_roles TO supabase_auth_admin;

-- Correct permission settings for custom_access_token_hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Set up RLS policy to allow auth admin to read user roles
DROP POLICY IF EXISTS "Allow auth admin to read user roles" ON public.user_roles;
CREATE POLICY "Allow auth admin to read user roles" 
ON public.user_roles
FOR SELECT
TO supabase_auth_admin
USING (true);

-- Set up RLS policy to allow auth admin to read profiles
DROP POLICY IF EXISTS "Allow auth admin to read profiles" ON public.profiles;
CREATE POLICY "Allow auth admin to read profiles" 
ON public.profiles
FOR SELECT
TO supabase_auth_admin
USING (true);

-- Make sure the custom_access_token_hook is security invoker with search_path set
ALTER FUNCTION public.custom_access_token_hook(jsonb)
SECURITY INVOKER
SET search_path = 'public';

-- Migration to ensure auth hook permissions
-- This migration grants the necessary permissions for the auth hook to function properly
-- and creates RLS policies to allow access to the relevant tables

-- Grant schema usage to supabase_auth_admin (this is required for the hook to access our schema)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Ensure the supabase_auth_admin role can execute our custom_access_token_hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- Ensure the auth admin can access the user_roles table
GRANT ALL ON TABLE public.user_roles TO supabase_auth_admin;

-- Create an RLS policy specifically for the auth admin to access user_roles
DROP POLICY IF EXISTS "Allow auth admin to read user roles" ON public.user_roles;
CREATE POLICY "Allow auth admin to read user roles" 
ON public.user_roles
AS permissive
FOR SELECT
TO supabase_auth_admin
USING (true);

-- Ensure the auth admin can access the profiles table
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;

-- Create an RLS policy specifically for the auth admin to access profiles
DROP POLICY IF EXISTS "Allow auth admin to read profiles" ON public.profiles;
CREATE POLICY "Allow auth admin to read profiles" 
ON public.profiles
AS permissive
FOR SELECT
TO supabase_auth_admin
USING (true);

-- Revoke execute permission from public users to secure the function
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM public, anon, authenticated;

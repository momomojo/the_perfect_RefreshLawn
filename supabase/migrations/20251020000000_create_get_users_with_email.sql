-- Create function to get users with email from auth schema
-- This function is required by the admin users page to display user emails
-- Date: 2025-10-20

CREATE OR REPLACE FUNCTION public.get_users_with_email()
 RETURNS TABLE(id uuid, email text, banned_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'pg_catalog', 'public', 'auth'
AS $function$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email::text, au.banned_until
  FROM auth.users au;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Add comment explaining the function's purpose
COMMENT ON FUNCTION public.get_users_with_email IS 'Gets users with email from auth schema for admin dashboard. Used to display user emails on the admin users page. SECURITY DEFINER with search_path for security.';

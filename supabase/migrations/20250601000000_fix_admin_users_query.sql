-- Fix the admin users page query issue
-- The current issue is with the query that tries to join auth.users with profiles

-- Create a function to safely fetch auth users with their emails
CREATE OR REPLACE FUNCTION get_users_with_email()
RETURNS TABLE (
  id uuid,
  email text,
  banned_until timestamptz
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email, au.banned_until
  FROM auth.users au;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_users_with_email() TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION get_users_with_email() IS 
'Returns auth user information including email for use in the admin dashboard. 
This function is used as a workaround for the direct join between profiles and auth.users tables.'; 
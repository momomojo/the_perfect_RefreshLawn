-- Migration to remove deprecated role management functions
-- This migration is intended to run AFTER the consolidate_role_functions migration
-- and only after verifying that the new functions are working correctly.

-- Since we have created proxy functions that redirect to our new consolidated functions,
-- we don't need to drop these functions immediately. They can be removed at a later time
-- if necessary, once all application code has been updated to use the new functions.

-- Mark the deprecated functions with comments so they are clearly identified for future removal
COMMENT ON FUNCTION public.sync_profile_role_to_user_roles() IS 'DEPRECATED: Use sync_user_role() instead';
COMMENT ON FUNCTION public.sync_user_role_from_profile() IS 'DEPRECATED: Use sync_user_role() instead';
COMMENT ON FUNCTION public.sync_user_roles_to_profile() IS 'DEPRECATED: Use sync_user_role() instead';
COMMENT ON FUNCTION public.handle_new_user() IS 'DEPRECATED: Use create_user_profile() instead';
COMMENT ON FUNCTION public.create_profile_for_user() IS 'DEPRECATED: Use create_user_profile() instead';
COMMENT ON FUNCTION public.check_and_fix_role_consistency() IS 'DEPRECATED: Use check_and_fix_roles() instead';
COMMENT ON FUNCTION public.add_user_role_to_jwt() IS 'DEPRECATED: Use custom_access_token_hook() instead';

-- Disable the delete_all_customers_and_providers dangerous function
CREATE OR REPLACE FUNCTION public.delete_all_customers_and_providers()
RETURNS TABLE(status text, customers_deleted integer, technicians_deleted integer, bookings_deleted integer, payment_methods_deleted integer, reviews_deleted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  status := 'FUNCTION DISABLED FOR SECURITY REASONS';
  customers_deleted := 0;
  technicians_deleted := 0;
  bookings_deleted := 0;
  payment_methods_deleted := 0;
  reviews_deleted := 0;
  
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.delete_all_customers_and_providers() IS 'DISABLED: This function has been disabled for security reasons';

-- Uninstall script for Supabase Custom Claims
-- Source: https://github.com/supabase-community/supabase-custom-claims

DROP FUNCTION IF EXISTS get_my_claims;
DROP FUNCTION IF EXISTS get_my_claim;
DROP FUNCTION IF EXISTS get_claims;
DROP FUNCTION IF EXISTS get_claim;
DROP FUNCTION IF EXISTS set_claim;
DROP FUNCTION IF EXISTS delete_claim;
DROP FUNCTION IF EXISTS is_claims_admin;

-- Notification to reload schema
NOTIFY pgrst, 'reload schema'; 
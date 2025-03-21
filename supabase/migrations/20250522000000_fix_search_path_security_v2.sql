-- Fix search_path security warnings in database functions
-- This migration adds an explicit 'SET search_path = pg_catalog, public;' to all functions
-- to prevent potential function injection vulnerabilities

-- For each function:
-- 1. We use 'OR REPLACE' to preserve the return type
-- 2. We add 'SECURITY DEFINER' to ensure functions run with the privileges of the user who created them
-- 3. We set a safe search_path

DO $$
DECLARE
  function_name text;
  function_args text;
  function_lang text;
  function_body text;
  function_return text;
  function_volatility text;
BEGIN
  -- Loop through all functions with search path warnings
  FOR function_name, function_args, function_lang, function_body, function_return, function_volatility IN
    SELECT 
      p.proname, 
      pg_get_function_arguments(p.oid), 
      l.lanname,
      pg_get_functiondef(p.oid),
      pg_get_function_result(p.oid),
      CASE p.provolatile 
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
      END
    FROM pg_proc p
    JOIN pg_language l ON p.prolang = l.oid
    WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname IN (
      'update_all_user_roles_in_metadata',
      'sync_user_roles_to_profile',
      'update_user_role_safe',
      'get_user_role',
      'is_admin',
      'is_technician',
      'is_customer',
      'get_my_claims',
      'delete_all_customers_and_providers',
      'get_my_claim',
      'is_claims_admin',
      'handle_new_user',
      'update_user_role',
      'sync_user_role_from_profile',
      'sync_profile_role_to_user_roles',
      'create_profile_for_user',
      'update_modified_column',
      'update_user_role_in_jwt_metadata',
      'custom_access_token_hook',
      'check_role_consistency',
      'fix_user_role_consistency',
      'fix_my_role_consistency'
    )
  LOOP
    -- Extract function body
    function_body := regexp_replace(function_body, '^.*AS\s+\$\w+\$(.*)\$\w+\$.*$', '\1', 'ms');
    
    -- Create the function with security definer and search_path set
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION public.%I(%s) 
       RETURNS %s
       LANGUAGE %s
       %s
       SECURITY DEFINER
       SET search_path = pg_catalog, public
       AS $func$
       %s
       $func$;',
      function_name,
      function_args,
      function_return,
      function_lang,
      function_volatility,
      function_body
    );
    
    RAISE NOTICE 'Fixed function: %', function_name;
  END LOOP;
END;
$$;

-- Add appropriate grants for all functions
DO $$
DECLARE
  func_name text;
BEGIN
  FOR func_name IN 
    SELECT 'public.' || routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND
          routine_type = 'FUNCTION' AND
          routine_name IN (
            'update_all_user_roles_in_metadata',
            'sync_user_roles_to_profile',
            'update_user_role_safe',
            'get_user_role',
            'is_admin',
            'is_technician',
            'is_customer',
            'get_my_claims',
            'delete_all_customers_and_providers',
            'get_my_claim',
            'is_claims_admin',
            'handle_new_user',
            'update_user_role',
            'sync_user_role_from_profile',
            'sync_profile_role_to_user_roles',
            'create_profile_for_user',
            'update_modified_column',
            'update_user_role_in_jwt_metadata',
            'custom_access_token_hook',
            'check_role_consistency',
            'fix_user_role_consistency',
            'fix_my_role_consistency'
          )
  LOOP
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || func_name || ' TO authenticated, anon, service_role';
  END LOOP;
END;
$$;

-- Special grant for custom_access_token_hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin; 
# Authentication Troubleshooting Guide

This guide provides steps to diagnose and resolve common authentication issues in the RefreshLawn application.

## Common Authentication Issues

### "Database error saving new user" During Signup

This error typically occurs due to one of the following reasons:

1. **Trigger Function Failure**: The `handle_new_user` trigger function that creates a user profile is encountering an error.
2. **Custom Access Token Hook Issues**: The JWT hook that adds role information to tokens is failing.
3. **Database Constraint Violations**: There might be constraints in the database preventing the creation of the user or profile.

### Role Inconsistency Issues

These occur when a user's role information is not consistent across:

- The `profiles` table
- The `user_roles` table
- The JWT token claims

## Diagnostic Steps

### 1. Check the Custom Access Token Hook

The custom access token hook must be properly configured in the Supabase dashboard:

1. Go to Supabase Dashboard > Authentication > Hooks
2. Verify that the JWT Access Token hook is enabled
3. Ensure it's set to use the `public.custom_access_token_hook` function

### 2. Verify Database Triggers

Check if the database triggers are working correctly:

```sql
-- List all triggers on auth.users table
SELECT tgname, tgrelid::regclass, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;

-- Check the handle_new_user function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_user';
```

### 3. Test User Creation Directly

You can test creating users directly in the database to bypass the API layer:

```sql
-- Insert a test user in auth.users
INSERT INTO auth.users (
  email,
  raw_user_meta_data
)
VALUES (
  'test@example.com',
  '{"role": "customer"}'::jsonb
);

-- Check if the profile was created
SELECT * FROM profiles WHERE id = (
  SELECT id FROM auth.users WHERE email = 'test@example.com'
);
```

### 4. Check for Role Inconsistencies

Users with inconsistent roles can be found using:

```sql
SELECT * FROM public.check_role_consistency()
WHERE consistency_status != 'OK';
```

## Solutions

### Fix 1: Run Migrations

Apply the latest migrations to ensure all fixes are in place:

```bash
supabase db reset
# or
supabase db push
```

### Fix 2: Fix User Roles Manually

For users with role inconsistencies, you can run:

```sql
SELECT * FROM public.fix_user_role_consistency();
```

### Fix 3: Update the handle_new_user Trigger

If the trigger is failing, replace it with the fixed version:

```sql
-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Fall back to basic profile
    BEGIN
      INSERT INTO public.profiles (id, role)
      VALUES (NEW.id, 'customer');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Critical error in handle_new_user: %', SQLERRM;
    END;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Fix 4: Verify Custom Access Token Hook

Ensure the hook is properly set up using the diagnostic test:

```sql
-- Test with a real user ID
WITH test_event AS (
  SELECT jsonb_build_object(
    'user_id', '...'::uuid, -- Replace with real user ID
    'claims', jsonb_build_object(
      'iss', 'supabase',
      'aud', 'authenticated',
      'role', 'authenticated',
      'exp', extract(epoch from now() + interval '1 hour')::bigint,
      'iat', extract(epoch from now())::bigint,
      'sub', '...', -- Same user ID
      'session_id', uuid_generate_v4(),
      'aal', 'aal1'
    )
  ) AS event
)
SELECT
  event AS input,
  public.custom_access_token_hook(event) AS output
FROM test_event;
```

## Application-Level Changes

### Simplified Signup

If database issues persist, use a simplified signup process temporarily:

```typescript
// Use the simplified signup function
import { simplifiedSignUp } from "../utils/simplifiedSignup";

const { data, error } = await simplifiedSignUp(email, password);
```

### Verify JWT After Login

Always verify the role is present in the JWT after login:

```typescript
// Check JWT after login
const checkUserRole = async (user) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    const decodedToken = jwtDecode(token);
    console.log("JWT Role:", decodedToken.user_role);
    console.log("App Metadata Role:", decodedToken.app_metadata?.role);
  }
};
```

## Preventative Measures

1. **Use Robust Error Handling**: Always implement comprehensive error handling in authentication functions.
2. **Test Different User Types**: Regularly test signup for all user roles.
3. **Monitor Auth Logs**: Keep an eye on authentication logs for patterns of failure.
4. **Maintain Migration History**: Document all migrations and their purpose.

## Helpful Tools

- **Auth Diagnostics Page**: Use the `/auth-diagnostics` page to view JWT and role information.
- **Signup Test Page**: Use the `/signup-test` page to test simplified signup.

# JWT Hook Setup Guide for Role-Based Access Control

This guide explains how to set up JWT hooks in Supabase for role-based access control in the RefreshLawn application.

## Overview

JWT (JSON Web Token) hooks are used to customize the JWT tokens issued by Supabase Auth. In our application, we use JWT hooks to include user roles in the token's claims, enabling role-based access control.

## How It Works

1. **User Creation**: When a user signs up, a profile is created with a default role of "customer".
2. **JWT Token Generation**: When a user signs in, Supabase Auth generates a JWT token.
3. **Custom Access Token Hook**: Our hook function modifies the token to include the user's role.
4. **Role-Based Access**: The application can then check the user's role from the JWT token.

## Migration Files

The JWT hook implementation consists of three migration files:

1. `20250316_jwt_custom_hook.sql`: Creates the custom access token hook function.
2. `20250316_jwt_helper_functions.sql`: Sets up helper functions and triggers for JWT claims.
3. `20250316_update_all_user_roles.sql`: Updates all existing users' app_metadata with their roles.

## Setup Steps

### 1. Run the Migrations

Execute the migration files in the following order:

```sql
-- 1. First, set up the custom access token hook
\i supabase/migrations/20250316_jwt_custom_hook.sql

-- 2. Then, set up the helper functions and triggers
\i supabase/migrations/20250316_jwt_helper_functions.sql

-- 3. Finally, update all existing users' app_metadata
\i supabase/migrations/20250316_update_all_user_roles.sql
```

### 2. Enable the JWT Hook in the Supabase Dashboard

1. Go to the Supabase Dashboard.
2. Navigate to Authentication > Hooks.
3. Under "Custom JWT Claims", toggle the switch to enable it.
4. In the dropdown, select "public.custom_access_token_hook".
5. Click "Save Changes".

### 3. Verify the JWT Hook

To verify that the JWT hook is working correctly:

1. Sign in to the application.
2. Examine the JWT token.
3. Verify that the `app_metadata` section contains the `user_role` field.

Example token payload:

```json
{
  "aud": "authenticated",
  "exp": 1742112935,
  "iat": 1742109335,
  "iss": "https://your-project.supabase.co/auth/v1",
  "sub": "user-id",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"],
    "user_role": "customer"
  },
  "user_metadata": {
    "email": "user@example.com"
  }
}
```

## Troubleshooting

### Users Missing Roles in JWT

If users are missing roles in their JWT tokens:

1. Verify the JWT hook is enabled in the dashboard.
2. Run the update script to ensure all users have the role in their app_metadata:
   ```sql
   \i supabase/migrations/20250316_update_all_user_roles.sql
   ```
3. Ask users to sign out and sign in again to get a new token.

### Polymorphic Type Error

If you encounter a "could not determine polymorphic type" error:

1. Ensure all functions use explicit type casting:

   ```sql
   to_jsonb(user_role::text)
   ```

2. Check the function definition in the database:
   ```sql
   SELECT prosrc FROM pg_proc WHERE proname = 'custom_access_token_hook';
   ```

### JWT Hook Not Being Called

If the JWT hook is not being called:

1. Check the permissions on the function:

   ```sql
   SELECT
     n.nspname as schema_name,
     p.proname as function_name,
     p.prosecdef as security_definer,
     p.proowner::regrole as function_owner
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE p.proname = 'custom_access_token_hook';
   ```

2. Ensure the function has the correct permissions:
   ```sql
   GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
   ```

## References

- [Supabase Auth Hooks Documentation](https://supabase.com/docs/guides/auth/auth-hooks)
- [Custom Access Token Hook Documentation](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [JWT Claims Documentation](https://supabase.com/docs/guides/auth/jwts)

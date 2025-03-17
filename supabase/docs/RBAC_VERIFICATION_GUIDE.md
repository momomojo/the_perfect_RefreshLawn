# RBAC Implementation Verification Guide

This guide provides steps to verify that the RBAC implementation is working correctly in your RefreshLawn application.

## Prerequisites

- Access to the Supabase Dashboard
- Access to a user account with each role (admin, technician, customer)

## Verification Steps

### 1. Verify Database Functions

In the Supabase Dashboard:

1. Go to **Table Editor**
2. Click **SQL** in the sidebar
3. Run the following queries:

```sql
-- Check if custom_access_token_hook is correctly implemented
SELECT prosrc, pronargs, proname
FROM pg_proc
WHERE proname = 'custom_access_token_hook';

-- Check if helper functions are correctly implemented
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('is_admin_jwt', 'is_technician_jwt', 'is_customer_jwt', 'user_role');
```

Verify that:

- The `custom_access_token_hook` function exists
- The function sets both `user_role` and `app_metadata.role` claims
- Helper functions check all locations for roles

### 2. Verify Permissions

```sql
-- Check if permissions are correctly set
SELECT
  grantee,
  privilege_type
FROM
  information_schema.role_routine_grants
WHERE
  routine_name = 'custom_access_token_hook';

-- Check for permission on profiles table
SELECT
  grantee,
  privilege_type
FROM
  information_schema.role_table_grants
WHERE
  table_name = 'profiles' AND
  grantee = 'supabase_auth_admin';
```

Verify that:

- `supabase_auth_admin` has EXECUTE privilege on the hook
- `supabase_auth_admin` has SELECT privilege on the profiles table

### 3. Enable the Hook in Dashboard

1. Go to **Authentication** > **Hooks**
2. Under "Custom Access Token" hook:
   - If no hook is configured, click "Add Hook"
   - Select "Database Function" as the type
   - Choose "public.custom_access_token_hook" from the dropdown
3. Click **Save** to apply the changes

### 4. Test with User Accounts

#### Testing in the Application

1. Sign up or log in with different roles (admin, technician, customer)
2. Verify that role-specific features are available/unavailable as expected
3. Use browser developer tools to inspect the JWT token:

```javascript
// In browser console
const {
  data: { session },
} = await supabase.auth.getSession();
const token = session.access_token;
const payload = JSON.parse(atob(token.split(".")[1]));
console.log(payload);
```

Verify that:

- `user_role` claim exists with the correct role
- `app_metadata.role` exists with the correct role

#### Testing with API

Create a test endpoint or use an existing one that requires specific roles.

For example, if you have an admin-only endpoint:

1. Try accessing it with an admin account (should succeed)
2. Try accessing it with a non-admin account (should fail)

### 5. Verify Row-Level Security

If your application uses RLS policies based on roles:

1. Create RLS policies that use the helper functions:

```sql
CREATE POLICY "Only admins can delete users"
ON users
FOR DELETE
TO authenticated
USING (auth.is_admin_jwt());
```

2. Test these policies with users of different roles

## Troubleshooting

If roles are not working properly:

1. **Hook Not Enabled**: Verify the hook is enabled in Authentication > Hooks
2. **Incorrect Profile Data**: Check profiles table to ensure roles are correct
3. **Token Not Refreshed**: Have users sign out and back in, or use refreshSession()
4. **Permissions Issue**: Verify supabase_auth_admin has proper permissions
5. **Check Claims Location**: Ensure client code checks all possible locations for the role

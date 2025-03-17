# Setting Up the Custom Access Token Hook in Supabase

This guide explains how to configure the custom access token hook in your Supabase project. This hook adds the user's role to the JWT tokens, which is essential for role-based access control.

## Automatic Configuration (Using supabase/config.toml)

The `supabase/config.toml` file already contains the necessary configuration:

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

This will automatically be used when you run the project locally with `supabase start`.

## Manual Configuration (In the Supabase Dashboard)

For your production project, you need to set up the hook manually in the Supabase dashboard:

1. Log in to your Supabase dashboard
2. Select your project
3. Go to **Authentication** → **Hooks**
4. For the **JWT Access Token** event type, click **+ Add Hook**
5. Select **Database Function** as the hook type
6. Choose **public.custom_access_token_hook** as the function
7. Ensure **Enabled** is toggled on
8. Click **Save**

## Verifying the Hook is Working

You can verify that the hook is working correctly by:

1. Log in with a user
2. Go to **Authentication** → **Users**, and select the user
3. Click on **View JWT** to see the token contents
4. Verify that `user_role` and `app_metadata.role` claims are present in the token

## Permissions

The function requires the following permissions, which were set in the migrations:

```sql
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
```

## Troubleshooting

If the hook is not working:

1. Verify that the function exists in the database by running:

   ```sql
   SELECT proname, proargtypes, prosrc
   FROM pg_proc
   WHERE proname = 'custom_access_token_hook'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
   ```

2. Check the function permissions:

   ```sql
   SELECT grantee, privilege_type
   FROM information_schema.routine_privileges
   WHERE routine_name = 'custom_access_token_hook'
   AND routine_schema = 'public';
   ```

3. Ensure the function is STABLE:
   ```sql
   SELECT proname, provolatile
   FROM pg_proc
   WHERE proname = 'custom_access_token_hook'
   AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
   ```
   It should return 's' for STABLE.

## Best Practices

- The hook is designed to be idempotent - it will work safely even if called multiple times
- It will fall back to the profile's role if no role is found in user_roles
- It will assign a default role of 'customer' if no role is found anywhere
- It includes detailed error handling and logging

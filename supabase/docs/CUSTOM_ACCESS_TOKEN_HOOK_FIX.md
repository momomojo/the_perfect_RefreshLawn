# Custom Access Token Hook Fix

## Issue Summary

We identified an issue with the custom access token hook that was causing the error:

```
Error running hook URI: pg-functions://postgres/public/custom_access_token_hook
```

This error was occurring during login attempts and sign up processes, preventing users from accessing the application.

## Root Causes and Fixes

The following issues were identified and fixed:

1. **Missing Error Handling:** The previous implementation of the hook didn't have proper error handling, causing the entire authentication process to fail if any part of the hook encountered an error.

2. **Potential JSONB Structure Issues:** The hook was making assumptions about the structure of the claims object, which could cause errors if the expected structure was not present.

3. **Permission Issues:** The `supabase_auth_admin` role may not have had the necessary permissions to execute the function.

4. **JWT Decode Package Missing:** On the client side, the `jwt-decode` package was referenced but not installed, causing client-side errors.

## Fixes Implemented

1. **Improved Error Handling:** We've wrapped the critical section of the hook function in a BEGIN/EXCEPTION block to catch and log errors without failing the entire authentication process.

2. **Safer JSONB Handling:** We now check if structures exist before trying to modify them and use COALESCE to provide default values.

3. **Re-applied Permissions:** We've explicitly granted the necessary permissions to the `supabase_auth_admin` role.

4. **Installed JWT Decode:** We've added the `jwt-decode` package to the project dependencies.

## Required Dashboard Configuration

After applying the migration, you must **manually enable the hook** in the Supabase Dashboard:

1. Go to **Authentication** > **Hooks** in your Supabase Dashboard
2. Under **JWT Custom Claims**, look for the "JWT Access Token" event:
   - If no hook is configured, click "Add Hook"
   - Select "Database Function" as the hook type
   - Choose "public.custom_access_token_hook" from the dropdown
3. Click **Save** to apply the changes

![Supabase Dashboard Hooks Configuration](https://docs.supabase.com/img/guides/auth/custom-access-token-hook/hooks-interface.png)

## Verifying the Fix

After applying the migration and configuring the dashboard:

1. **Sign out** of all accounts
2. Attempt to **sign in** with an existing account
3. If successful, check the JWT token claims with the following browser console code:

```javascript
const {
  data: { session },
} = await supabase.auth.getSession();
const token = session.access_token;
const payload = JSON.parse(atob(token.split(".")[1]));
console.log(payload);
```

You should see your `user_role` and `app_metadata.role` in the output.

## Troubleshooting

If issues persist:

1. **Check Hook Configuration:** Ensure the hook is enabled in the Supabase Dashboard.
2. **Check Logs:** Look for errors in the auth logs in the Supabase Dashboard.
3. **Check Permissions:** Verify that `supabase_auth_admin` has the necessary permissions.
4. **Restart the Service:** Sometimes a service restart in the Supabase Dashboard can resolve issues.
5. **Verify Profiles Table:** Make sure your profiles table contains the expected roles for your users.

## Need Further Help?

If issues persist after following this guide, please check the [Supabase documentation on Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) or contact the development team.

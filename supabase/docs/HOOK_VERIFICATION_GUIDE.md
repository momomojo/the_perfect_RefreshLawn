# Verifying the Custom Access Token Hook in Supabase Dashboard

To ensure your JWT claims correctly include user roles, you must verify that the custom access token hook is properly enabled in the Supabase Dashboard. This guide walks you through the necessary steps.

## Step 1: Access the Supabase Dashboard

1. Go to the [Supabase Dashboard](https://app.supabase.com) and sign in
2. Select your project from the list

## Step 2: Navigate to Authentication Hooks

1. In the left sidebar, click on **Authentication**
2. From the submenu, select **Hooks**

![Supabase Dashboard - Authentication Hooks](https://docs.supabase.com/img/guides/auth/custom-access-token-hook/hooks-interface.png)

## Step 3: Check Custom Access Token Hook Configuration

In the Authentication Hooks page:

1. Look for the **JWT Token** event
2. Check if the hook is enabled and properly configured:
   - If no hook is currently configured, click **Add Hook**
   - Select **Database Function** as the type
   - Choose `public.custom_access_token_hook` from the dropdown

![Add Custom Access Token Hook](https://docs.supabase.com/img/guides/auth/custom-access-token-hook/add-hook.png)

## Step 4: Save and Test

1. Click **Save** to apply the changes
2. Sign out of all user sessions
3. Sign in with a user account that has a role assigned
4. Verify the JWT token contains the correct role claim:

```javascript
// Run this in your browser console
const getJwtPayload = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const jwt = session.access_token;
  const payload = JSON.parse(atob(jwt.split(".")[1]));
  console.log("JWT Payload:", payload);
  console.log("User Role:", payload.user_role);
  console.log("App Metadata Role:", payload.app_metadata?.role);
  return payload;
};

getJwtPayload();
```

## Troubleshooting

### "Error running hook URI" during Signup/Login

If you encounter an error like `Error running hook URI: pg-functions://postgres/public/custom_access_token_hook` during signup or login:

1. **Required Claims Issue**: The most common cause is that the hook is attempting to modify or remove required JWT claims. Supabase strictly requires the following claims to be present:

   - `iss`: Issuer
   - `aud`: Audience
   - `exp`: Expiration time
   - `iat`: Issued at time
   - `sub`: Subject (user ID)
   - `role`: User's Supabase role (not to be confused with your app's custom role)
   - `aal`: Authentication assurance level
   - `session_id`: Unique session identifier

2. **Recent Fix**: We've implemented a fix in migration `20250501000600_fix_custom_access_token_hook_error.sql` that:

   - Checks for required claims before making modifications
   - Preserves all required claims during hook execution
   - Adds improved error handling to avoid hook failures

3. **Verify the Fix is Applied**: Check if the fixed hook is being used:
   ```sql
   SELECT pg_get_functiondef('public.custom_access_token_hook(jsonb)'::regprocedure);
   ```
   The function should include code that checks for required claims.

### Hook Not Being Applied

If the hook is configured but roles aren't appearing in the JWT:

1. **Check Database Function**: Ensure the `public.custom_access_token_hook` function exists in your database

   ```sql
   SELECT EXISTS(
     SELECT 1 FROM pg_proc
     WHERE proname = 'custom_access_token_hook'
   );
   ```

2. **Check Permissions**: Ensure the `supabase_auth_admin` role has execute permissions

   ```sql
   SELECT grantee, privilege_type
   FROM information_schema.role_routine_grants
   WHERE routine_name = 'custom_access_token_hook';
   ```

3. **Check User Roles**: Verify that the user has a role in the `user_roles` table
   ```sql
   SELECT * FROM public.user_roles
   WHERE user_id = '[USER_ID]';
   ```

### Manual Hook Verification

To verify the hook works as expected, you can run this test query in SQL Editor:

```sql
-- First, find an actual user ID to test with
SELECT id FROM auth.users LIMIT 1;
-- Note the ID and use it in the query below, replacing 'YOUR_USER_ID_HERE'

WITH test_event AS (
  SELECT jsonb_build_object(
    'user_id', 'YOUR_USER_ID_HERE'::uuid, -- ⚠️ Replace with actual user ID
    'claims', jsonb_build_object(
      'iss', 'supabase',
      'aud', 'authenticated',
      'role', 'authenticated',
      'exp', extract(epoch from now() + interval '1 hour')::bigint,
      'iat', extract(epoch from now())::bigint,
      'sub', 'YOUR_USER_ID_HERE', -- ⚠️ Replace with same user ID
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

The output should show the modified claims with your user's role. If it doesn't, or if you get an error, check that:

1. You've replaced `YOUR_USER_ID_HERE` with an actual user ID from your auth.users table
2. The user has a role assigned in either the `user_roles` or `profiles` table
3. The hook function is correctly implemented with proper variable naming

### Compare Claims Before and After

If you want to clearly see what the hook changed, you can run this query:

```sql
-- Replace with an actual user ID
\set user_id 'YOUR_USER_ID_HERE'

WITH test_event AS (
  SELECT jsonb_build_object(
    'user_id', :'user_id'::uuid,
    'claims', jsonb_build_object(
      'iss', 'supabase',
      'aud', 'authenticated',
      'role', 'authenticated',
      'exp', extract(epoch from now() + interval '1 hour')::bigint,
      'iat', extract(epoch from now())::bigint,
      'sub', :'user_id',
      'session_id', uuid_generate_v4(),
      'aal', 'aal1'
    )
  ) AS event
),
before_after AS (
  SELECT
    (test_event.event -> 'claims') AS before_claims,
    (public.custom_access_token_hook(test_event.event) -> 'claims') AS after_claims
  FROM test_event
)
SELECT
  before_claims,
  after_claims,
  after_claims - before_claims AS added_claims
FROM before_after;
```

This will show you exactly what fields were added by the hook.

### Force a Token Refresh

If you've made changes and need to test them:

1. Sign out completely

   ```javascript
   await supabase.auth.signOut({ scope: "global" });
   ```

2. Sign back in
3. Check the JWT token again with the script in Step 4
